/**
 * ChartDataManager - Reactive data cache and client-side fetcher
 *
 * Manages cached time-series data independently from the visible viewport.
 * Caches at the processed (chart-ready) level where each row has its own
 * timestamp, avoiding the index-alignment bug in TimeSeriesV2.transform().
 */

import { transformFacilityPowerData } from '$lib/components/charts/facility/helpers.js';
import { processForChart } from './dataProcessing.js';

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
 * @property {(acc: any, d: any) => any} [labelReducer] - Label reducer for processForChart
 * @property {(acc: any, d: any) => any} [colourReducer] - Colour reducer for processForChart
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
	/** @type {((acc: any, d: any) => any) | undefined} */ labelReducer;
	/** @type {((acc: any, d: any) => any) | undefined} */ colourReducer;

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
		this.labelReducer = config.labelReducer;
		this.colourReducer = config.colourReducer;
	}

	get isLoading() {
		return this.loadingRanges.length > 0;
	}

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
		const transformed = transformFacilityPowerData(
			powerResponse,
			this.unitFuelTechMap,
			this.metric
		);
		if (!transformed.length) return null;

		const processed = processForChart(transformed, 'W', {
			groupOrder: this.unitOrder,
			loadsToInvert: this.loadsToInvert,
			labelReducer: this.labelReducer,
			colourReducer: this.colourReducer
		});

		return {
			data: processed.data,
			seriesNames: processed.seriesNames,
			seriesColours: processed.seriesColours,
			seriesLabels: processed.seriesLabels
		};
	}

	/**
	 * Seed cache with server-provided data (no fetch).
	 * Called once with the initial server-side data.
	 *
	 * @param {any} powerResponse - Raw API response
	 */
	seedCache(powerResponse) {
		if (!powerResponse?.data) return;

		const result = this.#processResponse(powerResponse);
		if (!result || !result.data.length) return;

		this.#dataCache = result.data;
		this.#seriesMeta = {
			seriesNames: result.seriesNames,
			seriesColours: result.seriesColours,
			seriesLabels: result.seriesLabels
		};

		this.#updateCacheRange();
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

		// Debounce
		if (this.#fetchTimer) clearTimeout(this.#fetchTimer);
		this.#fetchTimer = setTimeout(() => {
			this.#executeFetch();
		}, 150);
	}

	async #executeFetch() {
		const pending = this.#pendingFetch;
		if (!pending) return;
		this.#pendingFetch = null;

		// Calculate actual gaps to fetch
		const gaps = this.#computeGaps(pending.start, pending.end);
		if (!gaps.length) return;

		for (const gap of gaps) {
			const key = `${gap.start}-${gap.end}`;
			if (this.#inFlightKeys.has(key)) continue;
			this.#inFlightKeys.add(key);

			// Add to loading ranges
			this.loadingRanges = [...this.loadingRanges, gap];

			try {
				const data = await this.#fetchFromApi(gap.start, gap.end);
				if (data) {
					this.#mergeProcessedData(data);
				}
			} catch (err) {
				console.error('ChartDataManager fetch error:', err);
			} finally {
				this.#inFlightKeys.delete(key);
				this.loadingRanges = this.loadingRanges.filter(
					(r) => r.start !== gap.start || r.end !== gap.end
				);
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
		// overlapping data harmless.
		const OVERLAP_MS = 10 * 60 * 1000; // 10 minutes (2x 5m interval)

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
		// The API expects timezone-naive dates in the network's local time.
		// Convert UTC ms → local time by adding the network's UTC offset.
		const offsetMs = this.networkId === 'WEM' ? 8 * 3600_000 : 10 * 3600_000;
		const dateStart = new Date(startMs + offsetMs).toISOString().slice(0, 19);
		const dateEnd = new Date(endMs + offsetMs).toISOString().slice(0, 19);

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
		if (this.#fetchTimer) clearTimeout(this.#fetchTimer);
		this.#pendingFetch = null;
	}
}
