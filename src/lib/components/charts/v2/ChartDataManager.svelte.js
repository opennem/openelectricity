/**
 * ChartDataManager - Reactive data cache and client-side fetcher
 *
 * Manages cached time-series data independently from the visible viewport.
 * Caches at the processed (chart-ready) level where each row has its own
 * timestamp, avoiding the index-alignment bug in TimeSeriesV2.transform().
 */

import { bisectTime, bisectTimeRight, mergeSortedByTime } from './binary-search.js';
import { offsetMsFromOffset } from './network-time.js';

/** No facility data exists before this date; every fetch window is clamped to it. */
const EARLIEST_DATA_MS = new Date('1998-12-01T00:00:00Z').getTime();

/**
 * OE API per-interval range caps (days) — the API rejects wider requests with
 * "Date range too large for {interval} interval. Maximum range is N days."
 * Sub-daily grains only; daily-or-coarser intervals are uncapped.
 * @type {Record<string, number>}
 */
export const OE_API_MAX_RANGE_DAYS = { '5m': 30, '1h': 365 };

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

/** Max completed responses kept for reuse. */
const RESPONSE_CACHE_MAX = 30;

/** Matches the chart API routes' `Cache-Control: max-age=300`. */
const RESPONSE_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Completed responses by URL, LRU by Map insertion order. `sharedFetch` only
 * dedupes *concurrent* requests; this lets sequential repeats of the same URL
 * (a group toggle re-fetching history, manager rebuilds) skip both the network
 * round-trip and the JSON re-parse. Right-edge batches embed a now-clamped
 * `date_end`, so only historical batches — the bulk of a wide window — hit.
 * @type {Map<string, { response: any, ts: number }>}
 */
const completedResponses = new Map();

/**
 * @param {string} url
 * @returns {any | undefined} the cached payload, or undefined on miss/expiry
 */
function getCachedResponse(url) {
	const entry = completedResponses.get(url);
	if (!entry) return undefined;
	if (Date.now() - entry.ts > RESPONSE_CACHE_TTL_MS) {
		completedResponses.delete(url);
		return undefined;
	}
	// Refresh recency
	completedResponses.delete(url);
	completedResponses.set(url, entry);
	return entry.response;
}

/**
 * @param {string} url
 * @param {any} response
 */
function storeCachedResponse(url, response) {
	// Never cache failures — a later retry should hit the network.
	if (response == null) return;
	completedResponses.delete(url);
	completedResponses.set(url, { response, ts: Date.now() });
	while (completedResponses.size > RESPONSE_CACHE_MAX) {
		const oldest = /** @type {string} */ (completedResponses.keys().next().value);
		completedResponses.delete(oldest);
	}
}

/**
 * Empty the completed-response LRU. For tests — module state would otherwise
 * leak fetch results between cases (fake timers never expire the TTL).
 */
export function clearCompletedResponses() {
	completedResponses.clear();
}

/**
 * Fetch a URL, collapsing concurrent identical requests into one network call
 * and serving recent completed responses from the module-level LRU.
 * Resolves to the API `response` payload, or `null` on a non-OK status.
 *
 * @param {string} url
 * @returns {Promise<any>}
 */
function sharedFetch(url) {
	const cached = getCachedResponse(url);
	if (cached !== undefined) return Promise.resolve(cached);

	let pending = inFlightFetches.get(url);
	if (!pending) {
		pending = fetch(url)
			.then(async (res) => {
				if (!res.ok) {
					console.error('ChartDataManager: API returned', res.status);
					return null;
				}
				const json = await res.json();
				storeCachedResponse(url, json.response);
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
 * @property {string} cacheKey - Identity of the data source (facility code, `${region}:${kind}`…)
 * @property {string} networkTimezone - Offset string used for API date formatting ('+10:00' / '+08:00')
 * @property {string} [interval] - Data interval (default: '5m')
 * @property {string} [metric] - Data metric (default: 'power')
 * @property {string} [seriesKey] - Identity of the series set baked into `processResponse`
 *   (unit set, fuel-tech grouping…). Owners compare it to detect a series-only change
 *   that needs a new manager even though cacheKey/interval/metric are unchanged.
 * @property {(response: any) => { data: any[], seriesNames: string[], seriesColours: Record<string, string>, seriesLabels: Record<string, string> } | null} processResponse - Maps a raw API response to chart-ready rows
 * @property {(params: URLSearchParams) => string} buildFetchUrl - Builds the request URL from the standard params (interval, metric, date_start, date_end)
 */

export default class ChartDataManager {
	// Config
	/** @type {string} */ cacheKey;
	/** @type {string} */ networkTimezone;
	/** @type {string} */ interval;
	/** @type {string} */ metric;
	/** @type {string} */ seriesKey;
	/** @type {(response: any) => { data: any[], seriesNames: string[], seriesColours: Record<string, string>, seriesLabels: Record<string, string> } | null} */
	processResponse;
	/** @type {(params: URLSearchParams) => string} */
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
		if (!config.processResponse || !config.buildFetchUrl) {
			throw new Error('ChartDataManager requires processResponse and buildFetchUrl');
		}
		this.cacheKey = config.cacheKey;
		this.networkTimezone = config.networkTimezone;
		this.interval = config.interval || '5m';
		this.metric = config.metric || 'power';
		this.seriesKey = config.seriesKey || '';
		this.processResponse = config.processResponse;
		this.buildFetchUrl = config.buildFetchUrl;
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

	// Memo backing for `processedCache` — keyed on the cache/meta references,
	// which are reassigned wholesale on every change.
	/** @type {any} */ #processedCacheMemo = null;
	/** @type {any[] | null} */ #processedCacheForData = null;
	/** @type {any} */ #processedCacheForMeta = null;

	/**
	 * Full processed cache with a stable identity — dependants get the same
	 * object until the data or meta actually change. Deliberately a plain memo
	 * rather than a `$derived`: managers are constructed inside component
	 * effects (and stashed/revived across them), so a class-level derived would
	 * be owned by — and destroyed with — the effect run that created it, making
	 * later reads inert/stale (svelte `derived_inert`). Reading the `$state`
	 * fields here still registers reactive dependencies for effect callers.
	 * Chart components slice by viewport through createVisibleAggregation()
	 * (display-aggregation.js), which memoises on this object's identity.
	 */
	get processedCache() {
		const data = this.#dataCache;
		const meta = this.#seriesMeta;
		if (!meta || !data.length) return null;

		if (this.#processedCacheForData !== data || this.#processedCacheForMeta !== meta) {
			this.#processedCacheForData = data;
			this.#processedCacheForMeta = meta;
			this.#processedCacheMemo = { data, ...meta };
		}
		return this.#processedCacheMemo;
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

		const result = this.processResponse(powerResponse);
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
	 * Max range per request, scaled by interval. Chunks wide gaps into batched
	 * fetches (see #splitGapIntoBatches).
	 *
	 * Splitting at OE_API_MAX_RANGE_DAYS keeps buffered sub-daily fetches valid
	 * — an over-cap span (e.g. a wide power viewport plus its pan buffers)
	 * arrives as multiple ≤cap batches instead of one rejected request. The
	 * window is already clamped to [1998 → now] in #executeFetch, so realistic
	 * "All" energy ranges never reach the uncapped fallback.
	 *
	 * @returns {number} max range in ms
	 */
	get #maxApiRangeMs() {
		const DAY = 24 * 60 * 60 * 1000;
		const capDays = OE_API_MAX_RANGE_DAYS[this.interval];
		if (capDays) return capDays * DAY;
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

		// Fetch batches concurrently — the merge is order-independent (sorted
		// two-pointer merge, new rows win on equal timestamps) and the loading/
		// empty-range bookkeeping is per-batch, so a split gap costs one round
		// trip instead of one per batch.
		const fetchBatch = async (/** @type {LoadingRange} */ batch) => {
			const key = `${batch.start}-${batch.end}`;
			if (this.#inFlightKeys.has(key)) return;
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
		};
		await Promise.all(allBatches.map(fetchBatch));

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
		const offsetMs = offsetMsFromOffset(this.networkTimezone);
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
			interval: this.interval,
			metric: this.metric,
			date_start: dateStart,
			date_end: dateEnd
		});

		return sharedFetch(this.buildFetchUrl(params));
	}

	/**
	 * Process new API response and merge the resulting rows into the cache.
	 * Each row has { date, time, series1: val, ... } so merging by timestamp
	 * avoids the index-alignment issue in the raw series format.
	 *
	 * @param {any} powerResponse
	 */
	#mergeProcessedData(powerResponse) {
		const result = this.processResponse(powerResponse);
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
