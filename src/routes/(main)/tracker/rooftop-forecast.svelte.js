import { untrack } from 'svelte';
import { forecastQuery, forecastRows } from './rooftop-forecast.js';

const HALF_HOUR_MS = 30 * 60_000;

/**
 * The rooftop solar forecast for the Tracker scope, fetched outside the chart
 * data manager: that manager never requests past now, by design.
 *
 * Refetches when the scope changes and once per half-hour of the session
 * clock (AEMO issues a run about every 30 minutes; the route edge-caches each
 * half-hour's response). Rows belong to the scope they were fetched for, so a
 * scope switch never draws the previous region's forecast.
 *
 * Must be called during component init — it registers an `$effect`.
 * @param {{ region: () => string, enabled: () => boolean, clock: () => number,
 * timeZone: () => string }} opts
 */
export function createRooftopForecast(opts) {
	/** @typedef {{ region: string, rows: Array<{ time: number, value: number }>, runTime: number | null }} LoadedForecast */
	let loaded = $state.raw(/** @type {LoadedForecast | null} */ (null));
	let error = $state(/** @type {Error | null} */ (null));
	let request = $derived(
		opts.enabled() ? `${opts.region()}|${Math.floor(opts.clock() / HALF_HOUR_MS)}` : null
	);

	$effect(() => {
		if (!request) return;
		const [region, tz, now] = untrack(() => [opts.region(), opts.timeZone(), opts.clock()]);
		const controller = new AbortController();
		fetch(`/api/network/data?${forecastQuery(region, /** @type {number} */ (now), tz)}`, {
			signal: controller.signal
		})
			.then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
			.then((json) => {
				loaded = { region: /** @type {string} */ (region), ...forecastRows(json.response) };
				error = null;
			})
			.catch((err) => {
				if (err?.name === 'AbortError') return;
				error = err instanceof Error ? err : new Error(String(err));
			});
		return () => controller.abort();
	});

	let current = $derived(loaded?.region === opts.region() ? loaded : null);
	return {
		get rows() {
			return current?.rows ?? [];
		},
		get runTime() {
			return current?.runTime ?? null;
		},
		get error() {
			return error;
		}
	};
}
