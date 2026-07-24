/**
 * Rune-based live grid data store for the tracker-map prototypes.
 *
 * Polls `/api/flows` (pairwise interconnector MW) and `/api/prices` (regional
 * spot prices) every dispatch-ish interval and exposes the latest values as
 * reactive getters. Small payloads, so plain `$state` is fine.
 */

import { processFlowsJson, processPricesJson } from '$lib/flows/process-flows.js';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/**
 * @returns {{
 *   readonly flows: Record<string, number>,
 *   readonly prices: Record<string, number>,
 *   readonly dispatchDateTimeString: string,
 *   start: () => void,
 *   stop: () => void,
 *   refresh: () => Promise<void>
 * }}
 */
export function createGridLive() {
	/** @type {Record<string, number>} */
	let flows = $state({});
	/** @type {Record<string, number>} */
	let prices = $state({});
	let dispatchDateTimeString = $state('');

	/** @type {ReturnType<typeof setInterval> | null} */
	let intervalId = null;
	/** @type {Promise<void> | null} */
	let inflight = null;

	async function fetchLatest() {
		try {
			const [flowsRes, pricesRes] = await Promise.all([fetch('/api/flows'), fetch('/api/prices')]);
			if (!flowsRes.ok || !pricesRes.ok) {
				throw new Error(`Live data fetch failed (${flowsRes.status}/${pricesRes.status})`);
			}

			const [flowsJson, pricesJson] = await Promise.all([flowsRes.json(), pricesRes.json()]);
			const processedFlows = processFlowsJson(flowsJson.data);
			const processedPrices = processPricesJson(pricesJson.data);

			flows = processedFlows.regionFlows;
			dispatchDateTimeString = processedFlows.dispatchDateTimeString;
			prices = processedPrices.regionPrices;
		} catch (e) {
			// The last good values stay on screen; the next poll retries.
			console.error('[tracker-map] live grid refresh failed:', e);
		}
	}

	/**
	 * Fetch the latest flows + prices. Concurrent calls share one request.
	 * @returns {Promise<void>}
	 */
	function refresh() {
		if (typeof window === 'undefined') return Promise.resolve();
		if (!inflight) {
			inflight = fetchLatest().finally(() => {
				inflight = null;
			});
		}
		return inflight;
	}

	/** Immediate refresh, then poll every 5 minutes. Idempotent. */
	function start() {
		if (typeof window === 'undefined' || intervalId !== null) return;
		refresh();
		intervalId = setInterval(refresh, REFRESH_INTERVAL_MS);
	}

	/** Stop polling (in-flight requests still settle). */
	function stop() {
		if (intervalId !== null) {
			clearInterval(intervalId);
			intervalId = null;
		}
	}

	return {
		get flows() {
			return flows;
		},
		get prices() {
			return prices;
		},
		get dispatchDateTimeString() {
			return dispatchDateTimeString;
		},
		start,
		stop,
		refresh
	};
}
