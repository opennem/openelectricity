/**
 * Pure computation for the tracker's fuel-tech table — average power,
 * contribution share and volume-weighted price per group over the visible
 * window.
 *
 * Every row set shares one grain, whose bucket lengths `bucketHours` gives by
 * start time: window summaries pass native rows, and inspection one display
 * bucket. Energy and average power use those durations, never a gap inferred
 * between rows — calendar months differ in length and filtered rows skip
 * periods. Ratios are ratios of window sums, never means of per-bucket ratios,
 * and sum only the periods both sides report: rows sharing a grain pair by
 * start time.
 *
 * No side effects, no fetching, no Svelte — unit-testable maths only.
 */

import {
	averagePower,
	isFiniteNumber,
	meanSeries,
	sumAsEnergy
} from '$lib/components/charts/network/network-metrics-calc.js';
import {
	DEMAND_GROSS_SERIES_ID,
	RENEWABLES_SERIES_ID
} from '$lib/components/charts/network/market-series-ids.js';
import {
	contributionSeries,
	contributionPercent
} from '$lib/components/charts/network/contribution.js';

/** @typedef {import('./types.js').ContributionMode} ContributionMode */
/** @typedef {import('./types.js').CurtailmentTableRow} CurtailmentTableRow */
/** @typedef {import('./types.js').FuelTechTableRow} FuelTechTableRow */
/** @typedef {import('./types.js').OverlaySummary} OverlaySummary */
/** @typedef {import('$lib/components/charts/network/network-metrics-calc.js').BucketHours} BucketHours */

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
	return rows.some((row) => isFiniteNumber(row[key]));
}

/**
 * One series' Σ numerator (market value $, emissions t) and Σ energy (MWh)
 * over only the periods reporting both. A numerator missing some periods
 * must not leave their energy in the denominator: two 100 MWh periods with
 * $10,000 in the first and nothing in the second are $100/MWh observed, not
 * $50. Zero and negative values are real readings and count. `partial`
 * reports a period with generation but no numerator, so the ratio covers
 * only part of the window. Null when no period reports both.
 * @param {Array<Record<string, any>>} numeratorRows - Per-period totals
 * @param {Array<Record<string, any>>} generationRows
 * @param {string} key
 * @param {'power' | 'energy'} basis
 * @param {BucketHours} bucketHours
 * @returns {{ numerator: number, energyMWh: number, partial: boolean } | null}
 */
function pairedWindowSums(numeratorRows, generationRows, key, basis, bucketHours) {
	/** @type {Map<number, number>} */
	const numerators = new Map();
	for (const row of numeratorRows) {
		if (isFiniteNumber(row[key])) numerators.set(row.time, row[key]);
	}
	let numerator = 0;
	let energyMWh = 0;
	let paired = false;
	let partial = false;
	for (const row of generationRows) {
		const value = numerators.get(row.time);
		const generation = row[key];
		if (!isFiniteNumber(generation)) continue;
		if (value === undefined) {
			// A period that generated nothing has nothing to settle or emit.
			if (generation !== 0) partial = true;
			continue;
		}
		numerator += value;
		energyMWh += basis === 'energy' ? generation : generation * bucketHours(row.time);
		paired = true;
	}
	return paired ? { numerator, energyMWh, partial } : null;
}

/**
 * Window energy (MWh) of one series, or null when it has no data at all —
 * a bare sum would read an absent feed as zero.
 * @param {Array<Record<string, any>>} rows
 * @param {string} key
 * @param {'power' | 'energy'} basis
 * @param {BucketHours} bucketHours
 */
function windowEnergy(rows, key, basis, bucketHours) {
	return hasFiniteValue(rows, key) ? sumAsEnergy(rows, [key], basis, bucketHours) : null;
}

/**
 * Average power (MW) per series over the window. Signed — loads stay negative.
 * @param {Array<Record<string, any>>} generationRows
 * @param {string[]} seriesNames
 * @param {'power' | 'energy'} basis
 * @param {BucketHours} bucketHours
 * @returns {Record<string, number | null>}
 */
export function computeAvPowerMW(generationRows, seriesNames, basis, bucketHours) {
	return Object.fromEntries(
		seriesNames.map((name) => [name, averagePower(generationRows, name, basis, bucketHours)])
	);
}

/**
 * Window energy (MWh) per series. Signed like average power — loads stay
 * negative. Null when the series has no finite value in the window.
 * @param {Array<Record<string, any>>} generationRows
 * @param {string[]} seriesNames
 * @param {'power' | 'energy'} basis
 * @param {BucketHours} bucketHours
 * @returns {Record<string, number | null>}
 */
export function computeEnergyMWh(generationRows, seriesNames, basis, bucketHours) {
	return Object.fromEntries(
		seriesNames.map((name) => [name, windowEnergy(generationRows, name, basis, bucketHours)])
	);
}

/**
 * Volume-weighted price ($/MWh) per series: Σ market value ÷ Σ energy over the
 * periods with both. Both sides carry the same load inversion, so a load's
 * negative ÷ negative yields its positive price paid. Null when the series has
 * no market settlement in the window or its paired energy is ~zero.
 * `vwPricePartial` flags a price missing some generating periods' market value.
 * @param {{
 *   mvRows: Array<Record<string, any>>,
 *   generationRows: Array<Record<string, any>>,
 *   seriesNames: string[],
 *   bucketHours: BucketHours,
 *   basis: 'power' | 'energy'
 * }} input
 * @returns {{ vwPrice: Record<string, number | null>, vwPricePartial: Record<string, boolean> }}
 */
export function computeVWPrices({ mvRows, generationRows, seriesNames, basis, bucketHours }) {
	/** @type {Record<string, number | null>} */
	const vwPrice = {};
	/** @type {Record<string, boolean>} */
	const vwPricePartial = {};
	for (const name of seriesNames) {
		const sums = pairedWindowSums(mvRows, generationRows, name, basis, bucketHours);
		const priced = sums !== null && Math.abs(sums.energyMWh) >= ENERGY_EPSILON_MWH;
		vwPrice[name] = priced ? sums.numerator / sums.energyMWh : null;
		vwPricePartial[name] = priced && sums.partial;
	}
	return { vwPrice, vwPricePartial };
}

/**
 * Emissions per series over the window: the volume (tCO₂e, Σ of per-bucket
 * tonnes — emissions rows are per-bucket totals like energy rows) and the
 * intensity (kgCO₂e/MWh, Σ tonnes ÷ Σ energy × 1000 over the periods with
 * both — a ratio of window sums). Loads report null on both: they consume
 * rather than produce, and their negative energy makes a ratio meaningless.
 * Null also when the series
 * has no emissions data in the window (imports, the WEM's missing feeds).
 * `intensityPartial` flags an intensity missing some generating periods'
 * emissions.
 *
 * @param {{
 *   emissionsRows: Array<Record<string, any>>,
 *   generationRows: Array<Record<string, any>>,
 *   seriesNames: string[],
 *   bucketHours: BucketHours,
 *   basis: 'power' | 'energy',
 *   loadSeriesIds: string[]
 * }} input
 * @returns {{ volumeT: Record<string, number | null>, intensityKgPerMWh: Record<string, number | null>, intensityPartial: Record<string, boolean> }}
 */
export function computeEmissions({
	emissionsRows,
	generationRows,
	seriesNames,
	basis,
	bucketHours,
	loadSeriesIds
}) {
	/** @type {Record<string, number | null>} */
	const volumeT = {};
	/** @type {Record<string, number | null>} */
	const intensityKgPerMWh = {};
	/** @type {Record<string, boolean>} */
	const intensityPartial = {};
	for (const name of seriesNames) {
		intensityPartial[name] = false;
		if (loadSeriesIds.includes(name) || !hasFiniteValue(emissionsRows, name)) {
			volumeT[name] = null;
			intensityKgPerMWh[name] = null;
			continue;
		}
		volumeT[name] = sumAsEnergy(emissionsRows, [name], 'energy');
		const sums = pairedWindowSums(emissionsRows, generationRows, name, basis, bucketHours);
		const rated = sums !== null && sums.energyMWh > ENERGY_EPSILON_MWH;
		intensityKgPerMWh[name] = rated ? (sums.numerator / sums.energyMWh) * 1000 : null;
		intensityPartial[name] = rated && sums.partial;
	}
	return { volumeT, intensityKgPerMWh, intensityPartial };
}

/**
 * The MWh denominator behind the contribution column — source generation
 * (loads and imports excluded) or gross demand, per the active mode.
 * Exposed so non-grouped rows (curtailment) can share the exact same base.
 *
 * @param {{
 *   generationRows: Array<Record<string, any>>,
 *   seriesNames: string[],
 *   bucketHours: BucketHours,
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
	bucketHours,
	mode,
	demandRows,
	demandBasis,
	loadSeriesIds
}) {
	if (mode === 'demand')
		return sumAsEnergy(demandRows, [DEMAND_GROSS_SERIES_ID], demandBasis, bucketHours);
	const sourceKeys = contributionSeries(seriesNames, loadSeriesIds, 'generation');
	return sumAsEnergy(generationRows, sourceKeys, basis, bucketHours);
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
 *   bucketHours: BucketHours,
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
	bucketHours,
	mode,
	demandRows,
	demandBasis,
	loadSeriesIds
}) {
	const included = contributionSeries(seriesNames, loadSeriesIds, mode);

	const denominatorMWh = contributionDenominatorMWh({
		generationRows,
		seriesNames,
		basis,
		bucketHours,
		mode,
		demandRows,
		demandBasis,
		loadSeriesIds
	});

	return Object.fromEntries(
		seriesNames.map((name) => {
			if (!included.includes(name) || !hasFiniteValue(generationRows, name)) return [name, null];
			return [
				name,
				contributionPercent(
					sumAsEnergy(generationRows, [name], basis, bucketHours),
					denominatorMWh,
					ENERGY_EPSILON_MWH
				)
			];
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
 *   emissionsRows: Array<Record<string, any>>,
 *   demandRows: Array<Record<string, any>>,
 *   bucketHours: BucketHours,
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
	emissionsRows,
	demandRows,
	basis,
	bucketHours,
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
	const avPower = computeAvPowerMW(generationRows, seriesNames, basis, bucketHours);
	const energy = computeEnergyMWh(generationRows, seriesNames, basis, bucketHours);
	const prices = computeVWPrices({ mvRows, generationRows, seriesNames, basis, bucketHours });
	const emissions = computeEmissions({
		emissionsRows,
		generationRows,
		seriesNames,
		basis,
		bucketHours,
		loadSeriesIds
	});
	const contribution = computeContribution({
		generationRows,
		seriesNames,
		basis,
		bucketHours,
		mode,
		demandRows,
		demandBasis,
		loadSeriesIds
	});

	return [...seriesNames].reverse().map((name) => {
		const signedAvPower = avPower[name];
		const signedEnergy = energy[name];
		return {
			id: name,
			label: seriesLabels?.[name] ?? name,
			colour: seriesColours?.[name] ?? '#6a6a6a',
			isLoad: loadSeriesIds.includes(name) || (signedAvPower ?? 0) < 0,
			hidden: hiddenSeries.includes(name),
			energyMWh: signedEnergy === null ? null : Math.abs(signedEnergy),
			avPowerMW: signedAvPower === null ? null : Math.abs(signedAvPower),
			contributionPct: contribution[name],
			vwPrice: prices.vwPrice[name],
			vwPricePartial: prices.vwPricePartial[name],
			emissionsT: emissions.volumeT[name],
			intensityKgPerMWh: emissions.intensityKgPerMWh[name],
			intensityPartial: emissions.intensityPartial[name],
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
 *   bucketHours: BucketHours,
 *   basis: 'power' | 'energy',
 *   denominatorMWh: number
 * }} input
 * @returns {CurtailmentTableRow[]}
 */
export function computeCurtailmentRows({ rows, series, basis, denominatorMWh, bucketHours }) {
	/** @type {CurtailmentTableRow[]} */
	const out = [];
	for (const { id, label } of series) {
		const av = averagePower(rows, id, basis, bucketHours);
		if (av === null) continue;
		const energyMWh = sumAsEnergy(rows, [id], basis, bucketHours);
		out.push({
			id,
			label,
			energyMWh: Math.abs(energyMWh),
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
 *   bucketHours: BucketHours,
 *   basis: 'power' | 'energy'
 * }} input
 * @returns {OverlaySummary}
 */
export function computeOverlaySummary({ demandRows, marketRows, shareRows, basis, bucketHours }) {
	return {
		demandEnergyMWh: windowEnergy(demandRows, 'demand', basis, bucketHours),
		demandAvMW: averagePower(demandRows, 'demand', basis, bucketHours),
		renewablesEnergyMWh: windowEnergy(marketRows, RENEWABLES_SERIES_ID, basis, bucketHours),
		renewablesAvMW: averagePower(marketRows, RENEWABLES_SERIES_ID, basis, bucketHours),
		renewablesSharePct: meanSeries(shareRows, 'renewable_share')
	};
}
