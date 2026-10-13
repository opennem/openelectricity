import { untrack } from 'svelte';
import { HALF_HOUR_MS } from '$lib/components/charts/network/rooftop-top-up.js';
import { forecastQuery, forecastRows } from './rooftop-forecast.js';

/** Retry cadence while the slot covering now is missing. */
export const FORECAST_RETRY_MS = 60_000;

/**
 * The rooftop solar forecast for the Tracker scope, fetched outside the chart
 * data manager: that manager never requests past now, by design.
 *
 * Refetches when the scope changes and once per half-hour of the session
 * clock (AEMO issues a run about every 30 minutes; the route edge-caches each
 * half-hour's response). Each slot comes from the run before it, which reaches
 * the API only minutes before the slot is due, so an early response can lack
 * the slot covering now; until it lands (or the fetch fails) the half-hour's
 * request is retried each minute, bypassing the browser's copy. Rows belong to
 * the scope they were fetched for, so a scope switch never draws the previous
 * region's forecast.
 *
 * Must be called during component init — it registers an `$effect`.
 * @param {{ region: () => string, enabled: () => boolean, clock: () => number,
 * timeZone: () => string }} opts
 */
export function createRooftopForecast(opts) {
	/** @typedef {{ region: string, rows: Array<{ time: number, value: number }>, runTime: number | null }} LoadedForecast */
	let loaded = $state.raw(/** @type {LoadedForecast | null} */ (null));
	let request = $derived(
		opts.enabled() ? `${opts.region()}|${Math.floor(opts.clock() / HALF_HOUR_MS)}` : null
	);

	$effect(() => {
		if (!request) return;
		const [region, tz, now] = untrack(() => [opts.region(), opts.timeZone(), opts.clock()]);
		const url = `/api/network/data?${forecastQuery(region, /** @type {number} */ (now), tz)}`;
		const slot = Math.floor(/** @type {number} */ (now) / HALF_HOUR_MS) * HALF_HOUR_MS;
		const controller = new AbortController();
		/** @type {ReturnType<typeof setTimeout> | undefined} */
		let retry;
		// Stops with the half-hour too, so a hidden tab (whose clock is paused)
		// doesn't keep asking.
		const retryLater = () => {
			if (Date.now() + FORECAST_RETRY_MS < slot + HALF_HOUR_MS) {
				retry = setTimeout(() => load('no-cache'), FORECAST_RETRY_MS);
			}
		};
		/** @param {RequestCache} cache */
		const load = (cache) =>
			fetch(url, { signal: controller.signal, cache })
				.then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
				.then((json) => {
					const forecast = forecastRows(json.response);
					loaded = { region: /** @type {string} */ (region), ...forecast };
					if ((forecast.rows.at(-1)?.time ?? -Infinity) < slot) retryLater();
				})
				.catch((err) => {
					if (err?.name === 'AbortError') return;
					// Optional data: without it the chart shows reported values only.
					console.warn('Rooftop forecast unavailable:', err);
					retryLater();
				});
		load('default');
		return () => {
			controller.abort();
			clearTimeout(retry);
		};
	});

	let current = $derived(loaded?.region === opts.region() ? loaded : null);
	return {
		get rows() {
			return current?.rows ?? [];
		},
		get runTime() {
			return current?.runTime ?? null;
		}
	};
}
