/**
 * Pure computation for the tracker's fuel-tech table — average power,
 * contribution share and volume-weighted price per group over the visible
 * window.
 *
 * Inputs are independently-grained row sets (the generation chart's
 * display-aggregated rows; market value and demand at their native grain), so
 * every cross-set ratio normalises each side to energy (MWh) using its own
 * interval length first — the `network-metrics-calc` doctrine. Ratios are
 * ratios of window sums, never means of per-bucket ratios.
 *
 * No side effects, no fetching, no Svelte — unit-testable maths only.
 */

import {
	averagePower,
	meanSeries,
	sumAsEnergy
} from '$lib/components/charts/network/network-metrics-calc.js';
import {
	DEMAND_GROSS_SERIES_ID,
	RENEWABLES_SERIES_ID
} from '$lib/components/charts/network/network-market-data.svelte.js';

/** @typedef {import('./types.js').ContributionMode} ContributionMode */
/** @typedef {import('./types.js').FuelTechTableRow} FuelTechTableRow */

/** Below this magnitude (MWh) a window's energy is noise, not a denominator. */
const ENERGY_EPSILON_MWH = 1e-6;

/**
 * Whether a series has at least one finite value in the window — distinguishes
 * "settled at $0" from "not settled at all" (e.g. rooftop solar has no market
 * value), where a bare sum would silently read as zero.
 * @param {Array<Record<string, any>>} rows
 * @param {string} key
 */
function hasFiniteValue(rows, key) {
	return rows.some((row) => typeof row[key] === 'number' && !isNaN(row[key]));
}

/**
 * Average power (MW) per series over the window. Signed — loads stay negative.
 * @param {Array<Record<string, any>>} generationRows
 * @param {string[]} seriesNames
 * @param {'power' | 'energy'} basis
 * @returns {Record<string, number | null>}
 */
export function computeAvPowerMW(generationRows, seriesNames, basis) {
	return Object.fromEntries(
		seriesNames.map((name) => [name, averagePower(generationRows, name, basis)])
	);
}

/**
 * Volume-weighted price ($/MWh) per series: Σ market value ÷ Σ energy over the
 * window. Both sides carry the same load inversion, so a load's negative ÷
 * negative yields its positive price paid. Null when the series has no market
 * settlement in the window or its energy is ~zero.
 * @param {{
 *   mvRows: Array<Record<string, any>>,
 *   generationRows: Array<Record<string, any>>,
 *   seriesNames: string[],
 *   basis: 'power' | 'energy'
 * }} input
 * @returns {Record<string, number | null>}
 */
export function computeVWPrices({ mvRows, generationRows, seriesNames, basis }) {
	return Object.fromEntries(
		seriesNames.map((name) => {
			if (!hasFiniteValue(mvRows, name)) return [name, null];
			const energyMWh = sumAsEnergy(generationRows, [name], basis);
			if (Math.abs(energyMWh) < ENERGY_EPSILON_MWH) return [name, null];
			return [name, sumAsEnergy(mvRows, [name], 'energy') / energyMWh];
		})
	);
}

/**
 * The MWh denominator behind the contribution column — source generation
 * (loads and imports excluded) or gross demand, per the active mode.
 * Exposed so non-grouped rows (curtailment) can share the exact same base.
 *
 * @param {{
 *   generationRows: Array<Record<string, any>>,
 *   seriesNames: string[],
 *   basis: 'power' | 'energy',
 *   mode: ContributionMode,
 *   demandRows: Array<Record<string, any>>,
 *   demandBasis: 'power' | 'energy',
 *   loadSeriesIds: string[]
 * }} input
 * @returns {number}
 */
export function contributionDenominatorMWh({
	generationRows,
	seriesNames,
	basis,
	mode,
	demandRows,
	demandBasis,
	loadSeriesIds
}) {
	if (mode === 'demand') return sumAsEnergy(demandRows, [DEMAND_GROSS_SERIES_ID], demandBasis);
	const sourceKeys = seriesNames.filter(
		(name) => !loadSeriesIds.includes(name) && name !== 'imports'
	);
	return sumAsEnergy(generationRows, sourceKeys, basis);
}

/**
 * Contribution share (%) per series.
 *
 * - `generation` mode: share of source generation — loads and imports are
 *   excluded from the denominator (they aren't generation) and report null.
 * - `demand` mode: share of gross demand — imports count (they help meet
 *   demand) but loads still report null; their negative energy adds to demand
 *   rather than serving it. Shares needn't sum to 100% (losses, basis
 *   differences) — that matches the homepage renewables methodology.
 *
 * Denominators span every series regardless of chart visibility, so toggling
 * a row never shifts its neighbours' percentages.
 *
 * @param {{
 *   generationRows: Array<Record<string, any>>,
 *   seriesNames: string[],
 *   basis: 'power' | 'energy',
 *   mode: ContributionMode,
 *   demandRows: Array<Record<string, any>>,
 *   demandBasis: 'power' | 'energy',
 *   loadSeriesIds: string[]
 * }} input
 * @returns {Record<string, number | null>}
 */
export function computeContribution({
	generationRows,
	seriesNames,
	basis,
	mode,
	demandRows,
	demandBasis,
	loadSeriesIds
}) {
	const isLoad = (/** @type {string} */ name) => loadSeriesIds.includes(name);

	const denominatorMWh = contributionDenominatorMWh({
		generationRows,
		seriesNames,
		basis,
		mode,
		demandRows,
		demandBasis,
		loadSeriesIds
	});

	return Object.fromEntries(
		seriesNames.map((name) => {
			const excluded = isLoad(name) || (mode === 'generation' && name === 'imports');
			if (excluded || denominatorMWh <= ENERGY_EPSILON_MWH) return [name, null];
			return [name, (sumAsEnergy(generationRows, [name], basis) / denominatorMWh) * 100];
		})
	);
}

/**
 * Assemble display rows: reversed series order (top-down stack order, matching
 * the chart legend), signed values folded to magnitudes, and section flags.
 * A group files under Loads when the grouping declares it all-load or its
 * window sum is negative (a mixed group charging more than it discharged).
 *
 * @param {{
 *   generationData: {
 *     data: Array<Record<string, any>>,
 *     seriesNames: string[],
 *     seriesLabels: Record<string, string>,
 *     seriesColours: Record<string, string>,
 *     groupFuelTechs?: Record<string, string[]>
 *   },
 *   mvRows: Array<Record<string, any>>,
 *   demandRows: Array<Record<string, any>>,
 *   basis: 'power' | 'energy',
 *   demandBasis: 'power' | 'energy',
 *   mode: ContributionMode,
 *   hiddenSeries: string[],
 *   loadSeriesIds: string[]
 * }} input
 * @returns {FuelTechTableRow[]}
 */
export function buildFuelTechTableRows({
	generationData,
	mvRows,
	demandRows,
	basis,
	demandBasis,
	mode,
	hiddenSeries,
	loadSeriesIds
}) {
	const {
		data: generationRows,
		seriesNames,
		seriesLabels,
		seriesColours,
		groupFuelTechs
	} = generationData;
	const avPower = computeAvPowerMW(generationRows, seriesNames, basis);
	const vwPrices = computeVWPrices({ mvRows, generationRows, seriesNames, basis });
	const contribution = computeContribution({
		generationRows,
		seriesNames,
		basis,
		mode,
		demandRows,
		demandBasis,
		loadSeriesIds
	});

	return [...seriesNames].reverse().map((name) => {
		const signedAvPower = avPower[name];
		return {
			id: name,
			label: seriesLabels?.[name] ?? name,
			colour: seriesColours?.[name] ?? '#6a6a6a',
			isLoad: loadSeriesIds.includes(name) || (signedAvPower ?? 0) < 0,
			hidden: hiddenSeries.includes(name),
			avPowerMW: signedAvPower === null ? null : Math.abs(signedAvPower),
			contributionPct: contribution[name],
			vwPrice: vwPrices[name],
			fuelTechs: groupFuelTechs?.[name] ?? []
		};
	});
}

/**
 * Curtailment rows — outside the fuel-tech grouping, valued like source rows
 * and shared against the same contribution denominator. Series with no data
 * in the window (e.g. the WEM, which has no curtailment feed) are dropped.
 *
 * @param {{
 *   rows: Array<Record<string, any>>,
 *   series: Array<{ id: string, label: string }>,
 *   basis: 'power' | 'energy',
 *   denominatorMWh: number
 * }} input
 * @returns {Array<{ id: string, label: string, avPowerMW: number, contributionPct: number | null }>}
 */
export function computeCurtailmentRows({ rows, series, basis, denominatorMWh }) {
	/** @type {Array<{ id: string, label: string, avPowerMW: number, contributionPct: number | null }>} */
	const out = [];
	for (const { id, label } of series) {
		const av = averagePower(rows, id, basis);
		if (av === null) continue;
		const energyMWh = sumAsEnergy(rows, [id], basis);
		out.push({
			id,
			label,
			avPowerMW: Math.abs(av),
			contributionPct:
				denominatorMWh > ENERGY_EPSILON_MWH ? (energyMWh / denominatorMWh) * 100 : null
		});
	}
	return out;
}

/**
 * Summary values for the table's overlay rows: operational demand (the OE
 * `demand` metric, not a derived net), official renewable generation (the
 * market pair's `generation_renewable`) and the official renewable share
 * (`renewable_proportion`) averaged over the window.
 *
 * @param {{
 *   demandRows: Array<Record<string, any>>,
 *   marketRows: Array<Record<string, any>>,
 *   shareRows: Array<Record<string, any>>,
 *   basis: 'power' | 'energy'
 * }} input
 * @returns {{ demandAvMW: number | null, renewablesAvMW: number | null, renewablesSharePct: number | null }}
 */
export function computeOverlaySummary({ demandRows, marketRows, shareRows, basis }) {
	return {
		demandAvMW: averagePower(demandRows, 'demand', basis),
		renewablesAvMW: averagePower(marketRows, RENEWABLES_SERIES_ID, basis),
		renewablesSharePct: meanSeries(shareRows, 'renewable_share')
	};
}
