/**
 * Pure metric computation for the tracker's network metrics section.
 *
 * The inputs are two independently-grained row sets: the generation chart's
 * visible rows (display-aggregated — e.g. 30m means at the 7D preset) and the
 * headless market pair's rows (native grain — e.g. 5m). Sums over different
 * row counts aren't comparable, so cross-set ratios normalise each side to
 * energy (MWh) using its own interval length first.
 *
 * The renewables share follows the homepage methodology
 * (`buildOeHomepageStats` in $lib/oe-api/calculate-renewables.js):
 * renewables = generation_renewable ÷ demand_gross, fossil = a real fueltech
 * sum ÷ demand_gross — never the remainder, so the pair needn't sum to 100%.
 *
 * No side effects, no fetching, no Svelte — unit-testable maths only.
 */

import {
	sumAllSeries,
	getIntervalHours
} from '$lib/components/charts/facility/metrics/metrics-calc.js';
import { FOSSIL_FUEL_TECHS } from '$lib/oe-api/fuel-tech-classes.js';
import { loadFuelTechs } from '$lib/fuel_techs';
import { RENEWABLES_SERIES_ID, DEMAND_GROSS_SERIES_ID } from './network-market-data.svelte.js';

/**
 * Total energy (MWh) across keys. Power rows hold MW means per bucket, so each
 * bucket contributes `value × intervalHours`; energy rows hold MWh directly.
 * @param {Array<Record<string, any>>} rows - Time-ordered, uniform interval
 * @param {string[]} keys
 * @param {'power' | 'energy'} basis
 * @returns {number}
 */
export function sumAsEnergy(rows, keys, basis) {
	const total = sumAllSeries(rows, keys);
	if (basis === 'energy') return total;
	const hours = getIntervalHours(rows);
	return hours > 0 ? total * hours : 0;
}

/**
 * Share of `denominatorKey` covered by `numeratorKey`, summed only over rows
 * where BOTH are present. Gross demand is null before May 2006 while
 * renewables data runs from 1999 — an unpaired sum would inflate the share on
 * wide ranges. `trimmed` reports whether any numerator rows were dropped.
 * Both series share the row set, so the interval length cancels and the ratio
 * holds at either basis.
 * @param {Array<Record<string, any>>} rows
 * @param {string} numeratorKey
 * @param {string} denominatorKey
 * @returns {{ pct: number | null, trimmed: boolean }}
 */
export function pairedShare(rows, numeratorKey, denominatorKey) {
	let numerator = 0;
	let denominator = 0;
	let trimmed = false;
	for (const row of rows) {
		const n = row[numeratorKey];
		const d = row[denominatorKey];
		const nOk = typeof n === 'number' && !isNaN(n);
		const dOk = typeof d === 'number' && !isNaN(d);
		if (nOk && dOk) {
			numerator += n;
			denominator += d;
		} else if (nOk && !dOk) {
			trimmed = true;
		}
	}
	return { pct: denominator > 0 ? (numerator / denominator) * 100 : null, trimmed };
}

/**
 * Plain mean of a series' finite values. Rows are uniform-interval, so this is
 * also the time-weighted mean.
 * @param {Array<Record<string, any>>} rows
 * @param {string} key
 * @returns {number | null}
 */
export function meanSeries(rows, key) {
	let sum = 0;
	let count = 0;
	for (const row of rows) {
		const val = row[key];
		if (typeof val === 'number' && !isNaN(val)) {
			sum += val;
			count++;
		}
	}
	return count > 0 ? sum / count : null;
}

/**
 * Average power (MW) of one series — a plain mean at power basis; at energy
 * basis each bucket's MWh is divided back by the bucket length.
 * @param {Array<Record<string, any>>} rows
 * @param {string} key
 * @param {'power' | 'energy'} basis
 * @returns {number | null}
 */
export function averagePower(rows, key, basis) {
	const mean = meanSeries(rows, key);
	if (mean === null || basis === 'power') return mean;
	const hours = getIntervalHours(rows);
	return hours > 0 ? mean / hours : null;
}

/**
 * The row with the highest finite value of `key`.
 * @param {Array<Record<string, any>>} rows
 * @param {string} key
 * @returns {{ value: number, time: number } | null}
 */
export function maxSeries(rows, key) {
	/** @type {{ value: number, time: number } | null} */
	let best = null;
	for (const row of rows) {
		const val = row[key];
		if (typeof val === 'number' && !isNaN(val) && (!best || val > best.value)) {
			best = { value: val, time: row.time };
		}
	}
	return best;
}

/**
 * @typedef {Object} NetworkMetricsContext
 * @property {number | null} renewablesPct
 * @property {boolean} renewablesTrimmed - Renewables rows dropped for missing demand
 * @property {number | null} fossilPct
 * @property {number | null} demandAvgMW
 * @property {{ value: number, time: number, isPower: boolean, periodLabel: string } | null} peakDemand
 * @property {number | null} avgPrice
 * @property {number | null} generationMWh - Source generation, imports excluded
 */

/**
 * Build the shared metrics context from the three visible-range row sets.
 * Callers pass `formatPeriodLabel` so peak subtitles match the chart's
 * time-format policy without dragging presentation concerns in here.
 *
 * @param {{
 *   generationRows: Array<Record<string, any>>,
 *   generationSeriesNames: string[],
 *   marketRows: Array<Record<string, any>>,
 *   priceRows: Array<Record<string, any>>,
 *   priceSeriesNames: string[],
 *   basis: 'power' | 'energy',
 *   formatPeriodLabel?: (timeMs: number) => string
 * }} input
 * @returns {NetworkMetricsContext}
 */
export function buildNetworkMetricsContext({
	generationRows,
	generationSeriesNames,
	marketRows,
	priceRows,
	priceSeriesNames,
	basis,
	formatPeriodLabel = () => ''
}) {
	const renewables = pairedShare(marketRows, RENEWABLES_SERIES_ID, DEMAND_GROSS_SERIES_ID);

	// Fossil crosses row sets (fueltech sum from the chart, demand from the
	// market pair) — normalise both sides to energy before ratioing.
	const demandMWh = sumAsEnergy(marketRows, [DEMAND_GROSS_SERIES_ID], basis);
	const fossilKeys = FOSSIL_FUEL_TECHS.filter((ft) => generationSeriesNames.includes(ft));
	const fossilMWh = fossilKeys.length ? sumAsEnergy(generationRows, fossilKeys, basis) : null;
	const fossilPct = fossilMWh !== null && demandMWh > 0 ? (fossilMWh / demandMWh) * 100 : null;

	const demandAvgMW = averagePower(marketRows, DEMAND_GROSS_SERIES_ID, basis);

	const peak = maxSeries(marketRows, DEMAND_GROSS_SERIES_ID);
	const peakDemand = peak
		? {
				...peak,
				isPower: basis === 'power',
				periodLabel: formatPeriodLabel(peak.time)
			}
		: null;

	// One price series in practice — the name comes from the chart's own
	// visible-data callback, so a rename can't strand this lookup.
	const avgPrice = priceSeriesNames.length ? meanSeries(priceRows, priceSeriesNames[0]) : null;

	// Source generation only — loads sit below zero in the diverging stack and
	// imports aren't generation.
	const sourceKeys = generationSeriesNames.filter(
		(name) => !loadFuelTechs.includes(name) && name !== 'imports'
	);
	const generationMWh = generationRows.length
		? sumAsEnergy(generationRows, sourceKeys, basis)
		: null;

	return {
		renewablesPct: renewables.pct,
		renewablesTrimmed: renewables.trimmed,
		fossilPct,
		demandAvgMW,
		peakDemand,
		avgPrice,
		generationMWh
	};
}
