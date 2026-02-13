/**
 * ChartDataManager - Reactive data cache and client-side fetcher
 *
 * Manages cached time-series data independently from the visible viewport.
 * Caches at the processed (chart-ready) level where each row has its own
 * timestamp, avoiding the index-alignment bug in TimeSeriesV2.transform().
 */

import { processFacilityPower } from '$lib/components/charts/facility/process-facility-power.js';

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
	 * Reactive getter — returns the full processed cache.
	 * Components should use getDataForRange() to slice by viewport.
	 */
	get processedCache() {
		if (!this.#seriesMeta || !this.#dataCache.length) return null;
		return {
			data: this.#dataCache,
			...this.#seriesMeta
		};
	}

	/**
	 * Process raw API response through the same pipeline as the original chart.
	 * Returns { data: [...rows], seriesNames, seriesColours, seriesLabels }.
	 *
	 * @param {any} powerResponse
	 * @returns {{ data: any[], seriesNames: string[], seriesColours: Record<string, string>, seriesLabels: Record<string, string> } | null}
	 */
	#processResponse(powerResponse) {
		const networkTimezone = this.networkId === 'WEM' ? '+08:00' : '+10:00';

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
		console.log('ChartDataManager seedCache:', {
			facilityCode: this.facilityCode,
			rows: this.#dataCache.length,
			cacheStart: this.#cacheStart ? new Date(this.#cacheStart).toISOString() : null,
			cacheEnd: this.#cacheEnd ? new Date(this.#cacheEnd).toISOString() : null
		});
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
	 */
	requestRange(start, end) {
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

		// Debounce
		if (this.#fetchTimer) clearTimeout(this.#fetchTimer);
		this.#fetchTimer = setTimeout(() => {
			this.#executeFetch();
		}, 150);
	}

	/** API max range per request (1000 days in ms) */
	static #MAX_API_RANGE_MS = 1000 * 24 * 60 * 60 * 1000;

	/**
	 * Split a gap into chunks that fit within the API's max range limit.
	 * @param {LoadingRange} gap
	 * @returns {LoadingRange[]}
	 */
	#splitGapIntoBatches(gap) {
		const maxRange = ChartDataManager.#MAX_API_RANGE_MS;
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
		const pending = this.#pendingFetch;
		if (!pending) return;
		this.#pendingFetch = null;

		// Calculate actual gaps to fetch
		const gaps = this.#computeGaps(pending.start, pending.end);
		if (!gaps.length) {
			this.hasPendingFetch = false;
			this.initialLoadComplete = true;
			return;
		}

		// Split any gap that exceeds the API's 1000-day limit into batches
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
				if (data) {
					this.#mergeProcessedData(data);
				}
			} catch (err) {
				console.error('ChartDataManager fetch error:', err);
			} finally {
				this.#inFlightKeys.delete(key);
				this.loadingRanges = this.loadingRanges.filter(
					(r) => r.start !== batch.start || r.end !== batch.end
				);
				this.initialLoadComplete = true;
				this.hasPendingFetch = this.#pendingFetch !== null || this.loadingRanges.length > 0;
			}
		}
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
		const OVERLAP_MS =
			this.interval === '1M' ? 31 * 24 * 60 * 60 * 1000 :
			this.interval === '1d' ? 24 * 60 * 60 * 1000 :
			10 * 60 * 1000; // 10 minutes for 5m

		/** @type {LoadingRange[]} */
		const gaps = [];

		if (start < this.#cacheStart) {
			gaps.push({ start, end: Math.min(end, this.#cacheStart + OVERLAP_MS) });
		}

		if (end > this.#cacheEnd) {
			gaps.push({ start: Math.max(start, this.#cacheEnd - OVERLAP_MS), end });
		}

		return gaps;
	}

	/**
	 * Fetch data from the API
	 * @param {number} startMs
	 * @param {number} endMs
	 * @returns {Promise<any|null>}
	 */
	async #fetchFromApi(startMs, endMs) {
		// Clamp date range — no data before Dec 1998, no future dates
		const EARLIEST_MS = new Date('1998-12-01T00:00:00Z').getTime();
		const now = Date.now();
		const clampedStart = Math.max(Math.min(startMs, now), EARLIEST_MS);
		const clampedEnd = Math.min(endMs, now);
		if (clampedStart >= clampedEnd) return null;

		// The API expects timezone-naive dates in the network's local time.
		// Convert UTC ms → local time by adding the network's UTC offset.
		const offsetMs = this.networkId === 'WEM' ? 8 * 3600_000 : 10 * 3600_000;
		const dateStart = new Date(clampedStart + offsetMs).toISOString().slice(0, 19);
		const dateEnd = new Date(clampedEnd + offsetMs).toISOString().slice(0, 19);

		const params = new URLSearchParams({
			network_id: this.networkId,
			interval: this.interval,
			metric: this.metric,
			date_start: dateStart,
			date_end: dateEnd
		});

		const res = await fetch(`/api/facilities/${this.facilityCode}/power?${params.toString()}`);
		if (!res.ok) {
			console.error('ChartDataManager: API returned', res.status);
			return null;
		}

		const json = await res.json();
		console.log('ChartDataManager fetch:', { facilityCode: this.facilityCode, dateStart, dateEnd, response: json.response });
		return json.response;
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

		// Build a map of existing rows by timestamp for fast dedup
		const rowMap = new Map(this.#dataCache.map((row) => [row.time, row]));

		// Add new rows (new timestamps win in case of overlap)
		for (const row of result.data) {
			rowMap.set(row.time, row);
		}

		// Sort by time
		const prevCount = this.#dataCache.length;
		this.#dataCache = [...rowMap.values()].sort((a, b) => a.time - b.time);

		// Update series meta if not set (shouldn't change between fetches)
		if (!this.#seriesMeta) {
			this.#seriesMeta = {
				seriesNames: result.seriesNames,
				seriesColours: result.seriesColours,
				seriesLabels: result.seriesLabels
			};
		}

		this.#updateCacheRange();
		console.log('ChartDataManager merge:', {
			facilityCode: this.facilityCode,
			newRows: result.data.length,
			prevTotal: prevCount,
			total: this.#dataCache.length,
			cacheStart: this.#cacheStart ? new Date(this.#cacheStart).toISOString() : null,
			cacheEnd: this.#cacheEnd ? new Date(this.#cacheEnd).toISOString() : null
		});
	}

	/**
	 * Get processed chart data for a given time range (slice of cache)
	 *
	 * @param {number} startMs
	 * @param {number} endMs
	 * @returns {any[]}
	 */
	getDataForRange(startMs, endMs) {
		if (!this.#dataCache.length) return [];

		return this.#dataCache.filter((/** @type {any} */ d) => {
			return d.time >= startMs && d.time <= endMs;
		});
	}

	/**
	 * Clear all cached data
	 */
	clearCache() {
		this.#dataCache = [];
		this.#seriesMeta = null;
		this.#cacheStart = null;
		this.#cacheEnd = null;
		this.loadingRanges = [];
		this.initialLoadComplete = false;
		this.hasPendingFetch = false;
		if (this.#fetchTimer) clearTimeout(this.#fetchTimer);
		this.#pendingFetch = null;
	}
}
