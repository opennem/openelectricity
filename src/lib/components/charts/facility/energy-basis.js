/**
 * Shared helpers for the facility derived-metric providers (price, intensity).
 *
 * Both `FacilityFinancialDataProvider` (price = market_value / energy) and
 * `FacilityEmissionsDataProvider` (intensity = emissions / energy) divide a
 * volume metric by energy. For energy intervals the OE API serves `energy`
 * (MWh) natively; the sub-daily `5m` grain (which also backs the 30m display)
 * has no native energy, so energy is derived as power (MW) × interval hours.
 *
 * Centralising the basis-metric choice, the combined query string, the
 * series-prefix rewriting and the per-timestamp energy (MWh) map keeps the two
 * providers in lock-step and makes the conversion unit-testable.
 */

import chroma from 'chroma-js';
import { getIntervalHours } from './interval-hours.js';

/**
 * Denominator metric to fetch for a native API interval. Keyed on the
 * `apiInterval` the manager fetches at (not the display id), so `'3M'`/`'1M'`
 * etc. all resolve to energy — only `'5m'` lacks native energy. The 30m display
 * fetches at `'5m'`, so it correctly resolves to power.
 *
 * @param {string} apiInterval
 * @returns {'power' | 'energy'}
 */
export function getBasisMetric(apiInterval) {
	return apiInterval === '5m' ? 'power' : 'energy';
}

/**
 * Combined metric query string shared by every manager across both providers so
 * the API computes them in one request and the HTTP cache dedupes the fetch.
 *
 * @param {string} basisMetric
 * @returns {string}
 */
export function combinedMetricsFor(basisMetric) {
	return `${basisMetric},market_value,emissions`;
}

/**
 * Build a `buildFetchUrl` callback that points the facility power endpoint at a
 * combined metric string. Shared by the generation chart and the price/emissions
 * providers so every manager resolves to one URL (and the in-flight fetch dedup
 * collapses them into a single request).
 *
 * @param {string} facilityCode
 * @param {string} combinedMetric - e.g. `energy,market_value,emissions`
 * @returns {(params: URLSearchParams) => string}
 */
export function buildCombinedMetricsUrl(facilityCode, combinedMetric) {
	return (/** @type {URLSearchParams} */ params) => {
		params.set('metric', combinedMetric);
		return `/api/facilities/${facilityCode}/power?${params.toString()}`;
	};
}

/**
 * Rewrite `power_<unit>` series IDs (as produced by analyzeUnits) to another
 * metric's prefix. `power → power` is a no-op.
 *
 * @param {string[]} ids
 * @param {string} toMetric
 * @returns {string[]}
 */
export function rewriteSeriesPrefix(ids, toMetric) {
	return ids.map((id) => id.replace(/^power_/, `${toMetric}_`));
}

/**
 * Build the colour accessor for a basis (power/energy) stack. Load units are
 * brightened so they read distinctly from generators. `loadIds` are `power_…`
 * IDs from analyzeUnits, rewritten to the basis prefix for matching.
 *
 * @param {Object} opts
 * @param {string} opts.basisMetric - 'power' | 'energy'
 * @param {Record<string, string>} opts.unitColours - unit code → base hex
 * @param {string[]} opts.loadIds - `power_<unit>` load IDs
 * @param {(fuelTech: string) => string} opts.getFuelTechColor - fallback colour
 * @returns {(unitCode: string, fuelTech: string) => string}
 */
export function createBasisColour({ basisMetric, unitColours, loadIds, getFuelTechColor }) {
	const basisLoadIds = rewriteSeriesPrefix(loadIds, basisMetric);
	return (/** @type {string} */ unitCode, /** @type {string} */ fuelTech) => {
		const baseColor = unitColours[unitCode] || getFuelTechColor(fuelTech);
		const isLoad = basisLoadIds.includes(`${basisMetric}_${unitCode}`);
		return isLoad ? chroma(baseColor).brighten(1).hex() : baseColor;
	};
}

/**
 * Sum the finite numeric series values in a row.
 *
 * @param {Record<string, any>} row
 * @param {string[]} seriesNames
 * @returns {number}
 */
export function sumSeries(row, seriesNames) {
	let total = 0;
	for (const key of seriesNames) {
		const v = row[key];
		if (typeof v === 'number' && !isNaN(v)) total += v;
	}
	return total;
}

/**
 * @typedef {Object} BasisContext
 * @property {boolean} isEnergyInterval - True for energy grains (native MWh)
 * @property {string} displayInterval - Rendered interval (drives power→MWh hours)
 * @property {string} ianaTimeZone - Network IANA zone
 */

/**
 * Build a `time → energy (MWh)` map from the basis rows. Native energy rows are
 * summed as-is; power rows are converted MW → MWh via the interval length. The
 * power display grains (5m/30m) have a fixed interval length, so the hours
 * factor is resolved once rather than per row.
 *
 * @param {any[]} basisRows
 * @param {string[]} basisSeriesNames
 * @param {BasisContext} ctx
 * @returns {Map<number, number>}
 */
export function buildEnergyMap(basisRows, basisSeriesNames, ctx) {
	const { isEnergyInterval, displayInterval, ianaTimeZone } = ctx;
	/** @type {Map<number, number>} */
	const energyMap = new Map();
	const powerHours = isEnergyInterval
		? 0
		: getIntervalHours(displayInterval, undefined, ianaTimeZone);
	for (const row of basisRows) {
		const total = sumSeries(row, basisSeriesNames);
		energyMap.set(row.time, isEnergyInterval ? total : total * powerHours);
	}
	return energyMap;
}

/**
 * Convert basis rows into per-unit `energy_<unit>` (MWh) rows for the summary
 * callback. Native energy rows pass through unchanged; power rows multiply each
 * unit by the (constant) interval hours and rename the prefix.
 *
 * @param {any[]} basisRows
 * @param {string[]} basisSeriesNames
 * @param {BasisContext} ctx
 * @returns {{ rows: any[], seriesNames: string[] }}
 */
export function toEnergySeriesRows(basisRows, basisSeriesNames, ctx) {
	const { isEnergyInterval, displayInterval, ianaTimeZone } = ctx;
	if (isEnergyInterval) {
		return { rows: basisRows, seriesNames: basisSeriesNames };
	}
	const powerHours = getIntervalHours(displayInterval, undefined, ianaTimeZone);
	const seriesNames = basisSeriesNames.map((k) => k.replace('power_', 'energy_'));
	const rows = basisRows.map((row) => {
		/** @type {Record<string, any>} */
		const out = { date: row.date, time: row.time };
		for (const key of basisSeriesNames) {
			const energyKey = key.replace('power_', 'energy_');
			const v = row[key];
			out[energyKey] = typeof v === 'number' ? v * powerHours : v;
		}
		return out;
	});
	return { rows, seriesNames };
}
