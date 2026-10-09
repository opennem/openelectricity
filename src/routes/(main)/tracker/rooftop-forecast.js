/**
 * AEMO's rooftop solar forecast on the Timeline Generation card. Rooftop
 * readings arrive up to half an hour after the other fuel techs, so the chart
 * tops up the rooftop series from the forecast to the latest data time — never
 * beyond it (`$lib/components/charts/network/rooftop-top-up.js`).
 *
 * The chart, table, window metrics and exports all see the topped-up rows;
 * no rows are added, so freshness still reports the newest reading. Pure
 * helpers; the reactive fetch is `rooftop-forecast.svelte.js`.
 */

import { getFuelTechColour } from '$lib/components/charts/colours.js';
import { toNetworkNaive } from '$lib/components/charts/v2/network-time.js';
import { regionToNetwork } from '$lib/components/charts/network/region-to-network.js';
import { HALF_HOUR_MS } from '$lib/components/charts/network/rooftop-top-up.js';

export const FORECAST_LABEL = 'Rooftop solar forecast';
/** Rooftop solar's own colour: the forecast extends that band. */
export const FORECAST_COLOUR = getFuelTechColour('solar_rooftop');

/** Reaches back past the latest rooftop reading, which can lag by half an hour. */
const LOOKBACK_MS = 2 * 3_600_000;

/** AEMO forecasts rooftop PV for the NEM and its regions only.
 * @param {string} region */
export function hasRooftopForecast(region) {
	return regionToNetwork(region).networkId === 'NEM';
}

/**
 * An AEMO run time as local HH:mm, for the table footnote.
 * @param {number} ms @param {string} timeZone
 */
export function formatRunTime(ms, timeZone) {
	return toNetworkNaive(ms, timeZone).slice(11, 16);
}

/**
 * `/api/network/data` query for the forecast around now: native 30-minute
 * slots up to the one covering now, half-hour-aligned so every reader in the
 * same half-hour shares the edge-cached response.
 * @param {string} region @param {number} nowMs @param {string} timeZone
 */
export function forecastQuery(region, nowMs, timeZone) {
	const slot = Math.floor(nowMs / HALF_HOUR_MS) * HALF_HOUR_MS;
	const start = Math.floor((nowMs - LOOKBACK_MS) / HALF_HOUR_MS) * HALF_HOUR_MS;
	const end = slot + HALF_HOUR_MS;
	return new URLSearchParams({
		region,
		metric: 'rooftop_forecast',
		interval: '30m',
		date_start: toNetworkNaive(start, timeZone),
		date_end: toNetworkNaive(end, timeZone)
	}).toString();
}

/**
 * Forecast slots (period-start, MW) and the AEMO run they come from.
 * @param {{ data?: Array<{ metric: string, forecast_run_time?: string | null, results?: Array<{ data?: Array<[string, number | null]> }> }> } | null | undefined} response
 * @returns {{ rows: Array<{ time: number, value: number }>, runTime: number | null }}
 */
export function forecastRows(response) {
	const entry = response?.data?.find((item) => item.metric === 'solar_rooftop_forecast');
	/** @type {Array<{ time: number, value: number }>} */
	const rows = [];
	for (const [stamp, value] of entry?.results?.[0]?.data ?? []) {
		if (typeof value === 'number' && Number.isFinite(value)) {
			rows.push({ time: Date.parse(stamp), value });
		}
	}
	rows.sort((a, b) => a.time - b.time);
	const runTime = entry?.forecast_run_time ? Date.parse(entry.forecast_run_time) : null;
	return { rows, runTime: Number.isFinite(runTime) ? runTime : null };
}
