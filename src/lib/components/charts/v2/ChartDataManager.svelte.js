/**
 * ChartDataManager - Reactive data cache and client-side fetcher
 *
 * Manages cached time-series data independently from the visible viewport.
 * Caches at the processed (chart-ready) level where each row has its own
 * timestamp, avoiding the index-alignment bug in TimeSeriesV2.transform().
 */

import { processFacilityPower } from '$lib/components/charts/facility/process-facility-power.js';
import { getNetworkTimezone } from '$lib/components/charts/facility/helpers.js';
import { bisectTime, bisectTimeRight, mergeSortedByTime } from './binary-search.js';
import { offsetMsFromOffset } from './network-time.js';

/** No facility data exists before this date; every fetch window is clamped to it. */
const EARLIEST_DATA_MS = new Date('1998-12-01T00:00:00Z').getTime();

/**
 * Concurrent identical API requests share a single in-flight fetch, keyed by URL.
 * The price and emissions providers each run a market_value/emissions manager
 * plus a basis (energy) manager, and all of them resolve to the *same* combined
 * `metric=energy,market_value,emissions` URL — without this they'd each fire
 * their own network request. The entry is removed once the fetch settles, so
 * later (non-concurrent) repeats fall through to the HTTP cache as before.
 *
 * @type {Map<string, Promise<any>>}
 */
const inFlightFetches = new Map();

/**
 * Fetch a URL, collapsing concurrent identical requests into one network call.
 * Resolves to the API `response` payload, or `null` on a non-OK status.
 *
 * @param {string} url
 * @returns {Promise<any>}
 */
function sharedFetch(url) {
	let pending = inFlightFetches.get(url);
	if (!pending) {
		pending = fetch(url)
			.then(async (res) => {
				if (!res.ok) {
					console.error('ChartDataManager: API returned', res.status);
					return null;
				}
				const json = await res.json();
				return json.response;
			})
			.finally(() => inFlightFetches.delete(url));
		inFlightFetches.set(url, pending);
	}
	return pending;
}

/**
 * @typedef {Object} LoadingRange
 * @property {number} start - Start timestamp (ms)
 * @property {number} end - End timestamp (ms)
 */

/**
 * @typedef {Object} ChartDataManagerConfig
 * @property {string} facilityCode - Facility code
 * @property {string} networkId - Network ID (NEM, WEM)
 * @property {string} [interval] - Data interval (default: '5m')
 * @property {string} [metric] - Data metric (default: 'power')
 * @property {Record<string, string>} unitFuelTechMap - Map unit code → fuel tech
 * @property {string[]} [unitOrder] - Unit ordering for chart processing
 * @property {string[]} [loadsToInvert] - Series IDs to invert
 * @property {(unitCode: string, fuelTech: string) => string} getLabel - Returns display label for a unit
 * @property {(unitCode: string, fuelTech: string) => string} getColour - Returns hex colour for a unit
 * @property {((response: any) => { data: any[], seriesNames: string[], seriesColours: Record<string, string>, seriesLabels: Record<string, string> } | null) | null} [processResponseFn] - Custom response processor (default: processFacilityPower)
 * @property {((params: URLSearchParams) => string) | null} [buildFetchUrl] - Custom URL builder for API requests (default: /api/facilities/{code}/power)
 */

export default class ChartDataManager {
	// Config
	/** @type {string} */ facilityCode;
	/** @type {string} */ networkId;
	/** @type {string} */ interval;
	/** @type {string} */ metric;
	/** @type {Record<string, string>} */ unitFuelTechMap;
	/** @type {string[]} */ unitOrder;
	/** @type {string[]} */ loadsToInvert;
	/** @type {(unitCode: string, fuelTech: string) => string} */ getLabel;
	/** @type {(unitCode: string, fuelTech: string) => string} */ getColour;
	/** @type {((response: any) => { data: any[], seriesNames: string[], seriesColours: Record<string, string>, seriesLabels: Record<string, string> } | null) | null} */
	processResponseFn;
	/** @type {((params: URLSearchParams) => string) | null} */
	buildFetchUrl;

	/**
	 * Processed chart data cache — sorted array of chart-ready rows,
	 * each with { date, time, series1: val, series2: val, ... }.
	 * Rows are deduped by timestamp.
	 * @type {any[]}
	 */
	#dataCache = $state.raw([]);

	/**
	 * Series metadata (names, colours, labels) from the initial processing.
	 * These don't change between fetches for the same facility.
	 * @type {{seriesNames: string[], seriesColours: Record<string, string>, seriesLabels: Record<string, string>} | null}
	 */
	#seriesMeta = $state.raw(null);

	// The time range covered by the cache
	/** @type {number | null} */ #cacheStart = $state(null);
	/** @type {number | null} */ #cacheEnd = $state(null);

	/** Whether the first data load (seed or fetch) has completed */
	initialLoadComplete = $state(false);

	// Loading state
	/** @type {LoadingRange[]} */
	loadingRanges = $state([]);

	// Debounce timer
	/** @type {ReturnType<typeof setTimeout> | null} */ #fetchTimer = null;
	/** @type {{start: number, end: number} | null} */ #pendingFetch = null;

	// Track in-flight requests to avoid duplicates
	/** @type {Set<string>} */ #inFlightKeys = new Set();

	// Ranges that returned no data — prevents re-fetching the same empty ranges
	/** @type {LoadingRange[]} */ #emptyRanges = [];

	// Bumped by dispose()/clearCache(); in-flight fetches capture the value at
	// entry and drop their results if it has moved on.
	#generation = 0;

	/**
	 * @param {ChartDataManagerConfig} config
	 */
	constructor(config) {
		this.facilityCode = config.facilityCode;
		this.networkId = config.networkId;
		this.interval = config.interval || '5m';
		this.metric = config.metric || 'power';
		this.unitFuelTechMap = config.unitFuelTechMap;
		this.unitOrder = config.unitOrder || [];
		this.loadsToInvert = config.loadsToInvert || [];
		this.getLabel = config.getLabel;
		this.getColour = config.getColour;
		this.processResponseFn = config.processResponseFn || null;
		this.buildFetchUrl = config.buildFetchUrl || null;
	}

	get isLoading() {
		return this.loadingRanges.length > 0;
	}

	/** Whether a fetch is pending (debouncing) or in-flight */
	hasPendingFetch = $state(false);

	get cacheStart() {
		return this.#cacheStart;
	}

	get cacheEnd() {
		return this.#cacheEnd;
	}

	get seriesMeta() {
		return this.#seriesMeta;
	}

	/**
	 * Full processed cache with a stable identity — derived so dependants only
	 * re-run when the cache or meta actually change, not on every access.
	 * Components should use getDataForRange() to slice by viewport.
	 */
	#processedCache = $derived.by(() => {
		if (!this.#seriesMeta || !this.#dataCache.length) return null;
		return {
			data: this.#dataCache,
			...this.#seriesMeta
		};
	});

	get processedCache() {
		return this.#processedCache;
	}

	/**
	 * Process raw API response through the same pipeline as the original chart.
	 * Returns { data: [...rows], seriesNames, seriesColours, seriesLabels }.
	 *
	 * @param {any} powerResponse
	 * @returns {{ data: any[], seriesNames: string[], seriesColours: Record<string, string>, seriesLabels: Record<string, string> } | null}
	 */
	#processResponse(powerResponse) {
		if (this.processResponseFn) {
			return this.processResponseFn(powerResponse);
		}

		const networkTimezone = getNetworkTimezone(this.networkId);

		return processFacilityPower(powerResponse, {
			unitFuelTechMap: this.unitFuelTechMap,
			unitOrder: this.unitOrder,
			loadsToInvert: this.loadsToInvert,
			getLabel: this.getLabel,
			getColour: this.getColour,
			metricFilter: this.metric,
			networkTimezone
		});
	}

	/**
	 * Seed cache with server-provided data (no fetch).
	 * Called once with the initial server-side data.
	 *
	 * @param {any} powerResponse - Raw API response
	 */
	seedCache(powerResponse) {
		if (!powerResponse?.data) {
			this.initialLoadComplete = true;
			return;
		}

		const result = this.#processResponse(powerResponse);
		if (!result || !result.data.length) {
			this.initialLoadComplete = true;
			return;
		}

		this.#dataCache = result.data;
		this.#seriesMeta = {
			seriesNames: result.seriesNames,
			seriesColours: result.seriesColours,
			seriesLabels: result.seriesLabels
		};

		this.#updateCacheRange();
		this.initialLoadComplete = true;
	}

	/**
	 * Recompute #cacheStart / #cacheEnd from #dataCache
	 */
	#updateCacheRange() {
		if (!this.#dataCache.length) {
			this.#cacheStart = null;
			this.#cacheEnd = null;
			return;
		}
		// Data is sorted by time
		const first = this.#dataCache[0];
		const last = this.#dataCache[this.#dataCache.length - 1];
		this.#cacheStart = first.time;
		this.#cacheEnd = last.time;
	}

	/**
	 * Fetch data for a range, checking cache gaps first.
	 * Uses debounce to batch rapid pan movements.
	 *
	 * @param {number} start - Start timestamp (ms)
	 * @param {number} end - End timestamp (ms)
	 * @param {{ immediate?: boolean }} [options] - Set immediate to skip debounce
	 */
	requestRange(start, end, { immediate = false } = {}) {
		// If fully cached, skip
		if (
			this.#cacheStart !== null &&
			this.#cacheEnd !== null &&
			start >= this.#cacheStart &&
			end <= this.#cacheEnd
		) {
			return;
		}

		// Merge with pending fetch to cover the widest gap
		if (this.#pendingFetch) {
			this.#pendingFetch.start = Math.min(this.#pendingFetch.start, start);
			this.#pendingFetch.end = Math.max(this.#pendingFetch.end, end);
		} else {
			this.#pendingFetch = { start, end };
		}
		this.hasPendingFetch = true;

		if (immediate) {
			// Execute immediately — used for initial load after metric switch
			if (this.#fetchTimer) clearTimeout(this.#fetchTimer);
			this.#executeFetch();
		} else {
			// Debounce
			if (this.#fetchTimer) clearTimeout(this.#fetchTimer);
			this.#fetchTimer = setTimeout(() => {
				this.#executeFetch();
			}, 150);
		}
	}

	/**
	 * Max range per request, scaled by interval. Acts as a safety net that
	 * chunks very wide gaps into sequential fetches (see #splitGapIntoBatches).
	 *
	 * The OE API no longer caps query range, so daily-or-coarser intervals can
	 * pull a full facility lifetime in a single request — the cap only stays
	 * tight for sub-daily grains (5m, 1h), where a wide span would be millions
	 * of points. The window is already clamped to [1998 → now] in #executeFetch,
	 * so realistic "All" energy ranges never reach this cap.
	 *
	 * @returns {number} max range in ms
	 */
	get #maxApiRangeMs() {
		const DAY = 24 * 60 * 60 * 1000;
		// High-resolution sub-daily grains (5m, 1h) can be millions of points over
		// a wide span, so keep a tight cap and let #splitGapIntoBatches chunk
		// anything wider.
		if (this.interval === '5m' || this.interval === '1h') return 1000 * DAY;
		// Every daily-or-coarser energy grain (1d/1M/3M/1y) yields at most ~11k
		// points across a full facility lifetime (daily ≈ 11k, monthly ≈ 360,
		// quarterly ≈ 120, yearly ≈ 30), so fetch the whole range in one request
		// rather than splitting it into batches.
		return 11000 * DAY;
	}

	/**
	 * Split a gap into chunks that fit within the API's max range limit.
	 * @param {LoadingRange} gap
	 * @returns {LoadingRange[]}
	 */
	#splitGapIntoBatches(gap) {
		const maxRange = this.#maxApiRangeMs;
		const duration = gap.end - gap.start;
		if (duration <= maxRange) return [gap];

		/** @type {LoadingRange[]} */
		const batches = [];
		let cursor = gap.start;
		while (cursor < gap.end) {
			const batchEnd = Math.min(cursor + maxRange, gap.end);
			batches.push({ start: cursor, end: batchEnd });
			cursor = batchEnd;
		}
		return batches;
	}

	async #executeFetch() {
		const gen = this.#generation;
		const pending = this.#pendingFetch;
		if (!pending) return;
		this.#pendingFetch = null;

		// Clamp the requested window to where data can exist BEFORE computing
		// gaps/batches. Callers add wide prefetch buffers (3× the viewport for
		// energy), so an "All" range would otherwise reach decades past 1998 /
		// into the future and split into wasted batches even though the real
		// window fits in a single request.
		const reqStart = Math.max(pending.start, EARLIEST_DATA_MS);
		const reqEnd = Math.min(pending.end, Date.now());
		if (reqEnd - reqStart < 1000) {
			this.hasPendingFetch = false;
			this.initialLoadComplete = true;
			return;
		}

		// Calculate actual gaps to fetch
		const gaps = this.#computeGaps(reqStart, reqEnd);
		if (!gaps.length) {
			this.hasPendingFetch = false;
			this.initialLoadComplete = true;
			return;
		}

		// Split any gap that exceeds the per-interval request cap into batches
		/** @type {LoadingRange[]} */
		const allBatches = [];
		for (const gap of gaps) {
			allBatches.push(...this.#splitGapIntoBatches(gap));
		}

		for (const batch of allBatches) {
			const key = `${batch.start}-${batch.end}`;
			if (this.#inFlightKeys.has(key)) continue;
			this.#inFlightKeys.add(key);

			// Add to loading ranges
			this.loadingRanges = [...this.loadingRanges, batch];

			try {
				const data = await this.#fetchFromApi(batch.start, batch.end);
				// dispose()/clearCache() while awaiting retired this generation —
				// drop the result instead of merging into dead/reset state.
				if (gen !== this.#generation) return;
				if (data) {
					const prevCacheSize = this.#dataCache.length;
					this.#mergeProcessedData(data);

					// If the cache didn't grow, this range has no data — record it
					if (this.#dataCache.length === prevCacheSize) {
						this.#emptyRanges.push(batch);
					}
				} else {
					// null return means invalid combo or clamped-away range — record as empty
					this.#emptyRanges.push(batch);
				}
			} catch (err) {
				console.error('ChartDataManager fetch error:', err);
			} finally {
				this.#inFlightKeys.delete(key);
				if (gen === this.#generation) {
					this.loadingRanges = this.loadingRanges.filter(
						(r) => r.start !== batch.start || r.end !== batch.end
					);
					this.initialLoadComplete = true;
					this.hasPendingFetch = this.#pendingFetch !== null || this.loadingRanges.length > 0;
				}
			}
		}

		if (gen !== this.#generation) return;

		// The requested window started before the earliest data point (the 1998
		// clamp on an over-buffered "All" range) — that pre-data span is empty.
		// Record it so later viewport ticks don't recompute a left gap and
		// re-fetch it. Energy ranges load in one batch, so cacheStart is the true
		// earliest; 5m never reaches back this far (viewport-limited). Guard against
		// re-pushing the same span on every tick (right-gap refreshes re-enter here).
		if (this.#cacheStart !== null && reqStart < this.#cacheStart) {
			const start = reqStart;
			const end = this.#cacheStart;
			if (!this.#emptyRanges.some((r) => r.start === start && r.end === end)) {
				this.#emptyRanges.push({ start, end });
			}
		}
	}

	/**
	 * Subtract known-empty ranges from a gap, returning the remaining sub-ranges.
	 * @param {LoadingRange} gap
	 * @returns {LoadingRange[]}
	 */
	#subtractEmptyRanges(gap) {
		/** @type {LoadingRange[]} */
		let remaining = [gap];

		for (const empty of this.#emptyRanges) {
			/** @type {LoadingRange[]} */
			const next = [];
			for (const r of remaining) {
				// No overlap — keep as-is
				if (empty.end <= r.start || empty.start >= r.end) {
					next.push(r);
					continue;
				}
				// Left remainder
				if (empty.start > r.start) {
					next.push({ start: r.start, end: empty.start });
				}
				// Right remainder
				if (empty.end < r.end) {
					next.push({ start: empty.end, end: r.end });
				}
			}
			remaining = next;
		}

		return remaining;
	}

	/**
	 * Compute which parts of [start, end] are NOT covered by the cache
	 * @param {number} start
	 * @param {number} end
	 * @returns {LoadingRange[]}
	 */
	#computeGaps(start, end) {
		if (this.#cacheStart === null || this.#cacheEnd === null) {
			return [{ start, end }];
		}

		// Overlap buffer: fetch a few extra intervals past the cache boundary
		// so there are no missing points at the seam. The dedup merge makes
		// overlapping data harmless. Scale by interval.
		const DAY_MS = 24 * 60 * 60 * 1000;
		const OVERLAP_MS =
			this.interval === '1y'
				? 365 * DAY_MS
				: this.interval === '3M'
					? 92 * DAY_MS
					: this.interval === '1M'
						? 31 * DAY_MS
						: this.interval === '1d'
							? DAY_MS
							: 10 * 60 * 1000; // 10 minutes for 5m

		/** @type {LoadingRange[]} */
		const gaps = [];

		if (start < this.#cacheStart) {
			// No overlap on the left: the existing first bucket is complete, so a
			// fetch up to cacheStart is contiguous. Extending past it would re-fetch
			// already-cached data on every over-buffered "All" viewport tick.
			gaps.push({ start, end: Math.min(end, this.#cacheStart) });
		}

		if (end > this.#cacheEnd) {
			// Keep the overlap on the right so the latest (possibly still-growing)
			// bucket is refreshed.
			gaps.push({ start: Math.max(start, this.#cacheEnd - OVERLAP_MS), end });
		}

		// Subtract ranges known to be empty so they aren't re-fetched
		/** @type {LoadingRange[]} */
		const filtered = [];
		for (const gap of gaps) {
			filtered.push(...this.#subtractEmptyRanges(gap));
		}

		return filtered;
	}

	/**
	 * Fetch data from the API
	 * @param {number} startMs
	 * @param {number} endMs
	 * @returns {Promise<any|null>}
	 */
	async #fetchFromApi(startMs, endMs) {
		// Validate metric/interval compatibility — 5m only supports power and market_value
		if (this.interval === '5m' && this.metric === 'energy') {
			console.warn(
				`ChartDataManager: skipping invalid combo interval=${this.interval}, metric=${this.metric}`
			);
			return null;
		}

		// Clamp date range — no data before Dec 1998, no future dates
		const now = Date.now();
		const clampedStart = Math.max(Math.min(startMs, now), EARLIEST_DATA_MS);
		const clampedEnd = Math.min(endMs, now);
		// Require at least 1 second between start and end — the API formats dates
		// at second precision (see below), so sub-second ranges collapse to an
		// empty window and the API returns NoDataFound.
		if (clampedEnd - clampedStart < 1000) return null;

		// The API expects timezone-naive dates in the network's local time.
		// Convert UTC ms → local time by adding the network's UTC offset.
		const offsetMs = offsetMsFromOffset(getNetworkTimezone(this.networkId));
		let dateStart = new Date(clampedStart + offsetMs).toISOString().slice(0, 19);
		let dateEnd = new Date(clampedEnd + offsetMs).toISOString().slice(0, 19);

		// Snap date boundaries to match the interval
		if (this.interval === '1y') {
			// Yearly: snap to 1 Jan
			dateStart = dateStart.slice(0, 4) + '-01-01T00:00:00';
			dateEnd = dateEnd.slice(0, 4) + '-01-01T00:00:00';
		} else if (this.interval === '3M') {
			// Quarterly: snap to start of quarter (Jan, Apr, Jul, Oct)
			const snapToQuarter = (/** @type {string} */ ds) => {
				const m = parseInt(ds.slice(5, 7), 10);
				const qMonth = String(Math.floor((m - 1) / 3) * 3 + 1).padStart(2, '0');
				return ds.slice(0, 4) + '-' + qMonth + '-01T00:00:00';
			};
			dateStart = snapToQuarter(dateStart);
			dateEnd = snapToQuarter(dateEnd);
		} else if (this.interval === '1M') {
			// Monthly: snap to first of month at midnight
			dateStart = dateStart.slice(0, 7) + '-01T00:00:00';
			dateEnd = dateEnd.slice(0, 7) + '-01T00:00:00';
		} else if (this.interval === '1d') {
			// Daily: snap to midnight
			dateStart = dateStart.slice(0, 10) + 'T00:00:00';
			dateEnd = dateEnd.slice(0, 10) + 'T00:00:00';
		}

		const params = new URLSearchParams({
			network_id: this.networkId,
			interval: this.interval,
			metric: this.metric,
			date_start: dateStart,
			date_end: dateEnd
		});

		const fetchUrl = this.buildFetchUrl
			? this.buildFetchUrl(params)
			: `/api/facilities/${this.facilityCode}/power?${params.toString()}`;

		return sharedFetch(fetchUrl);
	}

	/**
	 * Process new API response and merge the resulting rows into the cache.
	 * Each row has { date, time, series1: val, ... } so merging by timestamp
	 * avoids the index-alignment issue in the raw series format.
	 *
	 * @param {any} powerResponse
	 */
	#mergeProcessedData(powerResponse) {
		const result = this.#processResponse(powerResponse);
		if (!result || !result.data.length) return;

		const oldRows = this.#dataCache;
		const newRows = result.data;

		// Both sides are sorted by time (every response processor sorts), so
		// merge in O(n + m): pure append/prepend concat for the common pan and
		// right-edge-refresh cases, two-pointer merge for overlaps — new rows
		// win on equal timestamps so a re-fetched trailing bucket replaces the
		// cached (possibly still-growing) row.
		if (!oldRows.length) {
			this.#dataCache = newRows;
		} else if (newRows[0].time > oldRows[oldRows.length - 1].time) {
			this.#dataCache = oldRows.concat(newRows);
		} else if (newRows[newRows.length - 1].time < oldRows[0].time) {
			this.#dataCache = newRows.concat(oldRows);
		} else {
			this.#dataCache = mergeSortedByTime(oldRows, newRows);
		}

		// Update series meta if not set (shouldn't change between fetches)
		if (!this.#seriesMeta) {
			this.#seriesMeta = {
				seriesNames: result.seriesNames,
				seriesColours: result.seriesColours,
				seriesLabels: result.seriesLabels
			};
		}

		this.#updateCacheRange();
	}

	/**
	 * Get processed chart data for a given time range (slice of cache)
	 *
	 * @param {number} startMs
	 * @param {number} endMs
	 * @returns {any[]}
	 */
	getDataForRange(startMs, endMs) {
		const cache = this.#dataCache;
		if (!cache.length) return [];

		// Cache is sorted and deduped by time — slice [startMs, endMs] inclusive.
		return cache.slice(bisectTime(cache, startMs), bisectTimeRight(cache, endMs));
	}

	/**
	 * Clear all cached data (and, via dispose, cancel pending/in-flight work).
	 */
	clearCache() {
		this.dispose();
		this.#dataCache = [];
		this.#seriesMeta = null;
		this.#cacheStart = null;
		this.#cacheEnd = null;
		this.#emptyRanges = [];
		this.initialLoadComplete = false;
	}

	/**
	 * Retire this manager: cancel the pending debounce and make any in-flight
	 * fetch a no-op when it settles. The processed cache is left intact, so a
	 * stashed manager can be revived later — new requestRange() calls work
	 * normally after dispose.
	 *
	 * Note: the underlying network request is deliberately NOT aborted —
	 * `sharedFetch` responses are shared across managers by URL, so another
	 * (live) manager may still be waiting on the same request.
	 */
	dispose() {
		this.#generation++;
		if (this.#fetchTimer) clearTimeout(this.#fetchTimer);
		this.#fetchTimer = null;
		this.#pendingFetch = null;
		this.loadingRanges = [];
		this.hasPendingFetch = false;
	}
}
