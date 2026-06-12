import Statistic from '$lib/utils/Statistic';
import TimeSeries from '$lib/utils/TimeSeries';
import parseInterval from '$lib/utils/intervals';

import { alignStatsDataToCommonRange } from './align-stats-data';

/** @typedef {'legacy_opennem' | 'oe_proportion' | 'oe_secondary_renewable'} RenewableMode */

/** @typedef {{
 *   id: RenewableMode,
 *   label: string,
 *   description: string,
 *   numerator: string,
 *   fossilNumerator: string,
 *   fossilFueltechNumerator?: string,
 *   denominator: string
 * }} RenewableModeOption */

/**
 * Each mode's renewable share is always:
 *   `% = (numerator ÷ denominator) × 100`
 * The `numerator` and `denominator` strings spell out exactly which
 * underlying metric or fueltech sum goes on each side, so the chart card
 * can render the calculation explicitly.
 *
 * @type {RenewableModeOption[]}
 */
export const RENEWABLE_MODES = [
	{
		id: 'oe_proportion',
		label: 'OE getMarket · generation_renewable ÷ gross demand',
		description:
			'Official OE method (per the renewables guide). Since the June 2026 backend fix, generation_renewable_energy includes rooftop solar — cross-checking the live API shows it matches Σ(bioenergy + hydro + solar_utility + wind + solar_rooftop) from the fueltech data within ~1%. demand_gross_energy is null before May 2006 (rooftop solar coverage starts then), so demand-dependent lines — gross demand, the derived fossil and every % value — start there; generation_renewable_energy and the fueltech fossil sum plot from Jan 1999 in the raw view.',
		numerator:
			'generation_renewable_energy from OE getMarket — includes rooftop solar (fixed June 2026); empirically Σ(bioenergy + hydro + solar_utility + wind + solar_rooftop) within ~1%',
		fossilNumerator:
			'demand_gross_energy − generation_renewable_energy (derived — everything not in the renewable numerator: batteries, pumps, imports, all fossil generation)',
		fossilFueltechNumerator:
			'Σ(coal_black + coal_brown + gas_ccgt/ocgt/recip/steam/wcmg + distillate) from OE getNetworkData secondary_grouping=fueltech — fossils only, no battery (light brown line)',
		denominator: 'demand_gross_energy from OE getMarket (operational demand + rooftop solar)'
	},
	{
		id: 'oe_secondary_renewable',
		label: 'OE getNetworkData(renewable) · renewable=true ÷ gross demand',
		description:
			'OE classifies each fueltech as renewable=true/false and aggregates them server-side. The renewable=true bucket includes rooftop solar and tracks getMarket\'s generation_renewable_energy within ~1–2%. Both renewable=true and renewable=false buckets have full data back to Jan 1999 and plot from there in the raw view, but demand_gross_energy is null before May 2006 (rooftop solar coverage starts then), so the gross demand line and every % value start there.',
		numerator:
			'OE getNetworkData with secondary_grouping=renewable, the renewable=true row',
		fossilNumerator:
			'OE getNetworkData with secondary_grouping=renewable, the renewable=false row — also includes battery discharging and pumps (~300–560 GWh/month above a fossils-only fueltech sum)',
		fossilFueltechNumerator:
			'Σ(coal_black + coal_brown + gas_ccgt/ocgt/recip/steam/wcmg + distillate) from OE getNetworkData secondary_grouping=fueltech — fossils only, no battery (light brown line)',
		denominator: 'demand_gross_energy from OE getMarket (operational demand + rooftop solar)'
	},
	{
		id: 'legacy_opennem',
		label: 'OpenNEM JSON · fueltech sum ÷ generation − loads (reference)',
		description:
			'Reference baseline — the original homepage data path before the OE API migration. Local fueltech grouping sourced from the legacy /api/energy static JSON file. Battery charging is subtracted as a load; battery discharging is summed into the denominator as generation. Neither is in the renewable numerator.',
		numerator:
			'Σ(solar_utility + solar_rooftop + wind + hydro + bioenergy_*) — local sum from OpenNEM static JSON',
		fossilNumerator:
			'Σ(coal_black + coal_brown + gas_ccgt + gas_ocgt + gas_recip + gas_steam + gas_wcmg + distillate) — local sum from OpenNEM static JSON',
		denominator:
			'Σ(all generation fueltechs, incl. battery_discharging) − Σ(exports + battery_charging + pumps)'
	}
];

export const FOSSIL_ID = 'fossil_fuels.energy.grouped';
export const FOSSIL_FUELTECH_ID = 'fossil_fuels_fueltech.energy.grouped';
export const RENEWABLES_ID = 'renewables.energy.grouped';
export const TOTAL_ID = 'au-total';

// Legend labels stay short — the methodology card on /studio/renewables
// spells out the full formula for each fossil series.
const FOSSIL_FUELTECH_LABEL = 'Fossils (Σ fueltech)';
// Lighter shade of the derived fossil line's brown (#594929) at 60% opacity
// so the two fossil series read as related but stay distinguishable.
const FOSSIL_FUELTECH_COLOUR = '#A3906799';
const TOTAL_COLOUR = '#E03131';

// `data_type` keys we look up in `marketStats`. The first three are real OE
// metric names; the last two are synthetic tags emitted by transformOeToStatsData
// when the response uses secondary_grouping=renewable.
const METRIC = {
	demand: 'demand_gross_energy',
	renewable: 'generation_renewable_energy',
	renewableAggregate: 'generation_renewable_aggregate',
	nonRenewableAggregate: 'generation_non_renewable_aggregate'
};

/** @type {FuelTechCode[]} */
export const FOSSIL_FUEL_TECHS = [
	'coal_black',
	'coal_brown',
	'gas_ccgt',
	'gas_ocgt',
	'gas_recip',
	'gas_steam',
	'gas_wcmg',
	'distillate'
];

/** @type {FuelTechCode[]} */
export const RENEWABLE_FUEL_TECHS = [
	'solar_utility',
	'solar_rooftop',
	'wind',
	'hydro',
	'bioenergy_biogas',
	'bioenergy_biomass'
];

/** @type {FuelTechCode[]} */
export const LOAD_FUEL_TECHS = ['exports', 'battery_charging', 'pumps'];

const DOMAIN_GROUPS = {
	fossil_fuels: FOSSIL_FUEL_TECHS,
	renewables: RENEWABLE_FUEL_TECHS
};

/** @typedef {'rolling12mth' | 'monthly'} RenewableSmoothing */
/** @typedef {'percentage' | 'raw'} RenewableValueType */

/** @type {{ id: RenewableSmoothing, label: string, description: string }[]} */
export const RENEWABLE_SMOOTHING_OPTIONS = [
	{
		id: 'rolling12mth',
		label: '12-month rolling',
		description: 'Smoothed: each point covers the trailing 12 months'
	},
	{
		id: 'monthly',
		label: 'Monthly',
		description: 'Raw monthly values — noisier but shows seasonality'
	}
];

/** @type {{ id: RenewableValueType, label: string, description: string }[]} */
export const RENEWABLE_VALUE_TYPE_OPTIONS = [
	{
		id: 'percentage',
		label: '%',
		description: 'Renewable share as a percentage of the chosen denominator'
	},
	{
		id: 'raw',
		label: 'GWh',
		description: 'Raw energy values in GWh (no percentage conversion)'
	}
];

/**
 * @param {{ marketStats: StatsData[], legacyFueltechStats?: StatsData[] }} input
 * @param {RenewableMode} mode
 * @param {(acc: Object<string,string>, d: StatsData) => Object<string,string>} [colourReducer]
 * @param {RenewableSmoothing} [smoothing]
 * @param {RenewableValueType} [valueType]
 * @param {boolean} [showTotal] include the denominator series (gross demand or
 *   generation minus loads) as a plotted line. Flat 100% in percentage mode.
 * @returns {{
 *   dataset: TimeSeriesData[],
 *   statsDatasets: StatsData[],
 *   seriesNames: string[],
 *   seriesColours: Object<string,string>,
 *   seriesLabels: Object<string,string>
 * }}
 */
export function calculateRenewables(
	input,
	mode,
	colourReducer,
	smoothing = 'rolling12mth',
	valueType = 'percentage',
	showTotal = true
) {
	const marketStats = input?.marketStats ?? [];
	const legacyFueltechStats = input?.legacyFueltechStats ?? [];

	const empty = {
		dataset: /** @type {TimeSeriesData[]} */ ([]),
		statsDatasets: /** @type {StatsData[]} */ ([]),
		seriesNames: /** @type {string[]} */ ([]),
		seriesColours: /** @type {Object<string,string>} */ ({}),
		seriesLabels: /** @type {Object<string,string>} */ ({})
	};

	let statsDatasets;
	if (mode === 'legacy_opennem') {
		statsDatasets = buildLocalGroupingStats(legacyFueltechStats);
	} else if (mode === 'oe_proportion') {
		statsDatasets = buildOeProportionStats(marketStats);
	} else if (mode === 'oe_secondary_renewable') {
		statsDatasets = buildOeSecondaryRenewableStats(marketStats);
	} else {
		throw new Error(`Unknown renewable mode: ${mode}`);
	}

	if (!statsDatasets || statsDatasets.length === 0) return empty;

	const ts = new TimeSeries(
		statsDatasets,
		parseInterval('1M'),
		'history',
		labelReducer,
		colourWithOverride(colourReducer)
	).transform();

	if (smoothing === 'rolling12mth') {
		ts.calculate12MthRollingSum();
	}

	if (valueType === 'percentage') {
		ts.convertToPercentage(TOTAL_ID);
	}

	const seriesNames = showTotal
		? ts.seriesNames
		: ts.seriesNames.filter((/** @type {string} */ name) => name !== TOTAL_ID);

	return {
		dataset: ts.data,
		statsDatasets,
		seriesNames,
		seriesColours: ts.seriesColours,
		seriesLabels: ts.seriesLabels
	};
}

/**
 * Mode `legacy_opennem` — preserves the original homepage calculation.
 * Aligns fueltech series (Statistic.group requires equal lengths), groups them
 * into fossil_fuels / renewables, and uses generation-minus-loads as the total.
 *
 * @param {StatsData[]} fueltechStats
 * @returns {StatsData[]}
 */
function buildLocalGroupingStats(fueltechStats) {
	if (!fueltechStats || fueltechStats.length === 0) return [];
	const aligned = alignStatsDataToCommonRange(fueltechStats);
	const stats = new Statistic(aligned, 'history')
		.group(DOMAIN_GROUPS)
		.addTotalMinusLoads(LOAD_FUEL_TECHS, TOTAL_ID);
	// This mode's denominator isn't gross demand — label it accurately, but use
	// the same red so the denominator line reads consistently across charts.
	return stats.data.map((/** @type {StatsData} */ d) =>
		d.id === TOTAL_ID
			? { ...d, colour: TOTAL_COLOUR, label: 'Generation − loads (denominator)' }
			: d
	);
}

/**
 * Mode `oe_secondary_renewable` — uses the data endpoint's
 * secondary_grouping=renewable aggregate as the numerator and OE's
 * demand_gross_energy as the denominator. Includes rooftop solar in the
 * renewable bucket (unlike the market `generation_renewable_energy` metric,
 * which excludes it).
 *
 * @param {StatsData[]} marketStats
 * @returns {StatsData[]}
 */
function buildOeSecondaryRenewableStats(marketStats) {
	const renewable = findByDataType(marketStats, METRIC.renewableAggregate);
	const nonRenewable = findByDataType(marketStats, METRIC.nonRenewableAggregate);
	const demand = findByDataType(marketStats, METRIC.demand);
	if (!renewable || !demand) return [];

	// Align renewable + demand. nonRenewable is optional; if present we use it
	// for the fossil_fuels series, otherwise derive from demand − renewable.
	const fossilFueltech = buildFossilFueltechSum(marketStats);
	const sources = nonRenewable ? [renewable, nonRenewable, demand] : [renewable, demand];
	if (fossilFueltech) sources.push(fossilFueltech);
	const aligned = alignStatsDataToCommonRange(sources);
	const alignedRenewable = aligned[0];
	const alignedNonRenewable = nonRenewable ? aligned[1] : null;
	const alignedDemand = nonRenewable ? aligned[2] : aligned[1];
	const alignedFossilFueltech = fossilFueltech ? aligned[aligned.length - 1] : null;

	const renewablesRaw = alignedRenewable.history.data;
	const demandRaw = alignedDemand.history.data;
	const fossilRaw = alignedNonRenewable
		? alignedNonRenewable.history.data
		: subtractArrays(demandRaw, renewablesRaw);

	const arraysIn = [fossilRaw, renewablesRaw, demandRaw];
	if (alignedFossilFueltech) arraysIn.push(alignedFossilFueltech.history.data);
	const { arrays, meta } = trimSharedNulls(arraysIn, {
		start: alignedDemand.history.start,
		last: alignedDemand.history.last,
		interval: alignedDemand.history.interval
	});
	const [fossilData, renewablesData, demandData, fossilFueltechData] = arrays;

	const fossilLabel = alignedNonRenewable
		? 'Fossils (renewable=false)'
		: 'Fossils (derived)';

	return [
		makeGroupedStats(FOSSIL_ID, 'fossil_fuels', fossilData, meta, fossilLabel),
		...(fossilFueltechData ? [makeFossilFueltechStats(fossilFueltechData, meta)] : []),
		makeGroupedStats(RENEWABLES_ID, 'renewables', renewablesData, meta),
		makeTotalStats(TOTAL_ID, demandData, meta, 'Gross demand')
	];
}

/**
 * Mode `oe_proportion` — uses OE's published energy metrics.
 * Renewables = generation_renewable_energy
 * Fossils   = demand_gross_energy − generation_renewable_energy
 * Total     = demand_gross_energy
 *
 * @param {StatsData[]} marketStats
 * @returns {StatsData[]}
 */
function buildOeProportionStats(marketStats) {
	const renewable = findByDataType(marketStats, METRIC.renewable);
	const demand = findByDataType(marketStats, METRIC.demand);
	if (!renewable || !demand) return [];

	const fossilFueltech = buildFossilFueltechSum(marketStats);
	const sources = fossilFueltech ? [renewable, demand, fossilFueltech] : [renewable, demand];
	const aligned = alignStatsDataToCommonRange(sources);
	const [alignedRenewable, alignedDemand] = aligned;
	const alignedFossilFueltech = fossilFueltech ? aligned[2] : null;
	const renewablesRaw = alignedRenewable.history.data;
	const demandRaw = alignedDemand.history.data;
	const fossilRaw = subtractArrays(demandRaw, renewablesRaw);

	const arraysIn = [fossilRaw, renewablesRaw, demandRaw];
	if (alignedFossilFueltech) arraysIn.push(alignedFossilFueltech.history.data);
	const { arrays, meta } = trimSharedNulls(arraysIn, {
		start: alignedDemand.history.start,
		last: alignedDemand.history.last,
		interval: alignedDemand.history.interval
	});
	const [fossilData, renewablesData, demandData, fossilFueltechData] = arrays;

	return [
		makeGroupedStats(
			FOSSIL_ID,
			'fossil_fuels',
			fossilData,
			meta,
			'Fossils (derived)'
		),
		...(fossilFueltechData ? [makeFossilFueltechStats(fossilFueltechData, meta)] : []),
		makeGroupedStats(RENEWABLES_ID, 'renewables', renewablesData, meta),
		makeTotalStats(TOTAL_ID, demandData, meta, 'Gross demand')
	];
}

/**
 * Sum the OE per-fueltech energy series (secondary_grouping=fueltech) across
 * FOSSIL_FUEL_TECHS into one StatsData — fossils only, no battery or pumps.
 * Provides the light-brown comparison line drawn against the derived/bucket
 * fossil series in both OE modes. Returns null when no fossil fueltech rows are
 * present (the fueltech call failed or wasn't made).
 *
 * @param {StatsData[]} marketStats
 * @returns {StatsData | null}
 */
function buildFossilFueltechSum(marketStats) {
	const fossilStats = marketStats.filter(
		(d) => d.data_type === 'energy' && d.fuel_tech && FOSSIL_FUEL_TECHS.includes(d.fuel_tech)
	);
	if (fossilStats.length === 0) return null;

	const aligned = alignStatsDataToCommonRange(fossilStats);
	const data = sumArrays(aligned.map((d) => d.history.data));
	const { start, last, interval } = aligned[0].history;
	return makeGroupedStats(FOSSIL_FUELTECH_ID, 'fossil_fuels', data, { start, last, interval });
}

/**
 * @param {Array<number | null>} data
 * @param {{ start: string, last: string, interval: string }} meta
 * @returns {StatsData}
 */
function makeFossilFueltechStats(data, meta) {
	return /** @type {StatsData} */ ({
		...makeGroupedStats(FOSSIL_FUELTECH_ID, 'fossil_fuels', data, meta, FOSSIL_FUELTECH_LABEL),
		colour: FOSSIL_FUELTECH_COLOUR
	});
}

/**
 * Try matching by data_type first (set by transformOeToStatsData from the OE
 * `metric` field, e.g. `generation_renewable_energy`), falling back to id/name.
 *
 * @param {StatsData[]} stats
 * @param {string} key
 * @returns {StatsData | undefined}
 */
function findByDataType(stats, key) {
	return stats.find((d) => d.data_type === key) ?? stats.find((d) => d.id?.endsWith(`.${key}`));
}

/**
 * Trim leading/trailing months where ALL of the supplied arrays are null.
 * Returns the trimmed arrays + an updated meta whose `start` reflects the
 * first kept month. Months where only some series are null are kept — e.g.
 * demand_gross_energy is null before May 2006 while renewables runs from
 * Jan 1999 — so each line plots its full available range (MultiLine splits
 * its SVG path into segments around null values).
 *
 * @param {Array<number | null>[]} arrays
 * @param {{ start: string, last: string, interval: string }} meta
 * @returns {{ arrays: Array<number | null>[], meta: { start: string, last: string, interval: string } }}
 */
function trimSharedNulls(arrays, meta) {
	if (arrays.length === 0) return { arrays, meta };
	const len = arrays[0].length;

	let firstValid = 0;
	while (firstValid < len && arrays.every((a) => a[firstValid] == null)) firstValid++;

	let lastValid = len - 1;
	while (lastValid >= firstValid && arrays.every((a) => a[lastValid] == null)) lastValid--;

	if (firstValid === 0 && lastValid === len - 1) return { arrays, meta };
	if (firstValid > lastValid) return { arrays: arrays.map(() => []), meta };

	const trimmed = arrays.map((a) => a.slice(firstValid, lastValid + 1));
	const newStart = shiftMonths(meta.start, firstValid);
	const newLast = shiftMonths(meta.start, lastValid);
	return { arrays: trimmed, meta: { ...meta, start: newStart, last: newLast } };
}

/**
 * Shift an ISO month timestamp forward by `n` months, preserving the
 * `T00:00:00+10:00` time/offset suffix the rest of the pipeline expects.
 *
 * @param {string} iso
 * @param {number} n
 * @returns {string}
 */
function shiftMonths(iso, n) {
	const datePart = iso.split('T')[0]; // 'YYYY-MM-DD'
	const [y, m] = datePart.split('-').map(Number);
	const total = y * 12 + (m - 1) + n;
	const newY = Math.floor(total / 12);
	const newM = (total % 12) + 1;
	const tail = iso.slice(datePart.length); // 'T00:00:00+10:00' or ''
	return `${newY}-${String(newM).padStart(2, '0')}-01${tail}`;
}

/**
 * @param {string} id
 * @param {string} fuelTech
 * @param {Array<number | null>} data
 * @param {{ start: string, last: string, interval: string }} meta
 * @param {string} [label]
 * @returns {StatsData}
 */
function makeGroupedStats(id, fuelTech, data, meta, label) {
	return /** @type {StatsData} */ ({
		id,
		type: 'energy',
		fuel_tech: /** @type {FuelTechCode} */ (fuelTech),
		data_type: 'energy',
		units: 'GWh',
		network: 'NEM',
		...(label ? { label } : {}),
		history: { ...meta, data }
	});
}

/**
 * @param {string} id
 * @param {Array<number | null>} data
 * @param {{ start: string, last: string, interval: string }} meta
 * @param {string} [label]
 * @returns {StatsData}
 */
function makeTotalStats(id, data, meta, label) {
	return /** @type {StatsData} */ ({
		id,
		type: 'energy',
		data_type: 'energy',
		units: 'GWh',
		network: 'NEM',
		colour: TOTAL_COLOUR,
		...(label ? { label } : {}),
		history: { ...meta, data }
	});
}

/**
 * Index-wise null-safe sum across arrays: a null entry counts as 0 unless
 * every array is null at that index (→ null). Keeps a single fueltech's early
 * gap (e.g. gas_recip pre-commissioning) from clipping the whole summed line
 * via trimSharedNulls.
 *
 * @param {Array<number | null>[]} arrays
 * @returns {Array<number | null>}
 */
function sumArrays(arrays) {
	const len = Math.max(...arrays.map((a) => a.length));
	const out = /** @type {Array<number | null>} */ (new Array(len));
	for (let i = 0; i < len; i++) {
		let sum = null;
		for (const a of arrays) {
			const v = a[i];
			if (v != null) sum = (sum ?? 0) + v;
		}
		out[i] = sum;
	}
	return out;
}

/**
 * @param {Array<number | null>} a
 * @param {Array<number | null>} b
 * @returns {Array<number | null>}
 */
function subtractArrays(a, b) {
	const len = Math.max(a.length, b.length);
	const out = /** @type {Array<number | null>} */ (new Array(len));
	for (let i = 0; i < len; i++) {
		const av = a[i];
		const bv = b[i];
		out[i] = av == null || bv == null ? null : av - bv;
	}
	return out;
}

/**
 * Per-record `colour` overrides the theme's fuel-tech colour lookup — used
 * for the fueltech-summed fossil line, whose fuel_tech ('fossil_fuels')
 * would otherwise collide with the derived fossil series' brown.
 *
 * @param {((acc: Object<string,string>, d: StatsData) => Object<string,string>) | undefined} colourReducer
 * @returns {(acc: Object<string,string>, d: StatsData) => Object<string,string>}
 */
function colourWithOverride(colourReducer) {
	return (acc, d) => {
		if (d.colour) {
			acc[d.id] = d.colour;
			return acc;
		}
		return colourReducer ? colourReducer(acc, d) : acc;
	};
}

/**
 * Per-record `label` overrides what would otherwise default to "Fossils"
 * or "Renewables", letting OE-market modes spell out that fossil is derived.
 *
 * @param {Object<string,string>} acc
 * @param {StatsData} d
 * @returns {Object<string,string>}
 */
function labelReducer(acc, d) {
	if (d.label) acc[d.id] = d.label;
	else if (d.id === FOSSIL_ID) acc[d.id] = 'Fossils';
	else if (d.id === RENEWABLES_ID) acc[d.id] = 'Renewables';
	else acc[d.id] = d.fuel_tech ?? d.id;
	return acc;
}
