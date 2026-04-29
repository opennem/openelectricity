import Statistic from '$lib/utils/Statistic';
import TimeSeries from '$lib/utils/TimeSeries';
import parseInterval from '$lib/utils/intervals';

import { alignStatsDataToCommonRange } from './align-stats-data';

/** @typedef {'legacy_opennem' | 'current' | 'current_gross_demand' | 'oe_proportion' | 'oe_with_storage' | 'oe_secondary_renewable'} RenewableMode */

/** @typedef {{
 *   id: RenewableMode,
 *   label: string,
 *   description: string,
 *   numerator: string,
 *   fossilNumerator: string,
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
		id: 'legacy_opennem',
		label: 'OpenNEM JSON · fueltech sum ÷ generation − loads',
		description:
			'Original homepage data path. Local fueltech grouping sourced from the legacy /api/energy static JSON file.',
		numerator:
			'Σ(solar_utility + solar_rooftop + wind + hydro + bioenergy_*) — local sum from OpenNEM static JSON',
		fossilNumerator:
			'Σ(coal_black + coal_brown + gas_ccgt + gas_ocgt + gas_recip + gas_steam + gas_wcmg + distillate) — local sum from OpenNEM static JSON',
		denominator:
			'Σ(all generation fueltechs) − Σ(exports + battery_charging + pumps)'
	},
	{
		id: 'current',
		label: 'OE getNetworkData · fueltech sum ÷ generation − loads',
		description:
			'Same calculation as the OpenNEM JSON mode, but the fueltech series come from the OE API getNetworkData endpoint instead of the static JSON file.',
		numerator:
			'Σ(solar_utility + solar_rooftop + wind + hydro + bioenergy_*) — local sum from OE getNetworkData',
		fossilNumerator:
			'Σ(coal_black + coal_brown + gas_ccgt + gas_ocgt + gas_recip + gas_steam + gas_wcmg + distillate) — local sum from OE getNetworkData',
		denominator:
			'Σ(all generation fueltechs) − Σ(exports + battery_charging + pumps)'
	},
	{
		id: 'oe_secondary_renewable',
		label: 'OE getNetworkData(renewable) · renewable=true ÷ gross demand',
		description:
			'OE classifies each fueltech as renewable=true/false and aggregates them server-side. The renewable=true bucket includes rooftop solar.',
		numerator:
			'OE getNetworkData with secondary_grouping=renewable, the renewable=true row',
		fossilNumerator:
			'OE getNetworkData with secondary_grouping=renewable, the renewable=false row (also includes battery_discharging)',
		denominator: 'demand_gross_energy from OE getMarket (operational demand + rooftop solar)'
	},
	{
		id: 'current_gross_demand',
		label: 'OE getNetworkData · fueltech sum ÷ gross demand',
		description:
			'Hybrid: the local fueltech grouping (same as the homepage / OpenNEM JSON modes) on the numerator, but the OE gross-demand metric as denominator. Apples-to-apples comparison vs the OE getMarket modes.',
		numerator:
			'Σ(solar_utility + solar_rooftop + wind + hydro + bioenergy_*) — local sum from OE getNetworkData',
		fossilNumerator:
			'Σ(coal_black + coal_brown + gas_ccgt + gas_ocgt + gas_recip + gas_steam + gas_wcmg + distillate) — local sum from OE getNetworkData',
		denominator: 'demand_gross_energy from OE getMarket (operational demand + rooftop solar)'
	},
	{
		id: 'oe_proportion',
		label: 'OE getMarket · generation_renewable ÷ gross demand',
		description:
			'Official OE method (per the renewables guide). The numerator excludes rooftop solar because rooftop is treated as a demand-side offset that already shrinks the denominator.',
		numerator: 'generation_renewable_energy from OE getMarket — excludes rooftop solar',
		fossilNumerator:
			'demand_gross_energy − generation_renewable_energy (derived — also includes battery discharge, imports, etc.)',
		denominator: 'demand_gross_energy from OE getMarket (operational demand + rooftop solar)'
	},
	{
		id: 'oe_with_storage',
		label: 'OE getMarket · gen_renewable + battery ÷ gross demand',
		description:
			'OE method with battery discharge added to the renewable numerator. Mirrors the OE renewable_with_storage_proportion metric (computed locally because the SDK does not expose it yet — pumped-hydro discharge is also not broken out).',
		numerator:
			'generation_renewable_energy from OE getMarket + battery_discharging from OE getNetworkData',
		fossilNumerator:
			'demand_gross_energy − (generation_renewable_energy + battery_discharging) (derived — also includes imports, etc.)',
		denominator: 'demand_gross_energy from OE getMarket (operational demand + rooftop solar)'
	}
];

export const FOSSIL_ID = 'fossil_fuels.energy.grouped';
export const RENEWABLES_ID = 'renewables.energy.grouped';
export const TOTAL_ID = 'au-total';

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
 * @param {{ fueltechStats: StatsData[], marketStats: StatsData[], legacyFueltechStats?: StatsData[] }} input
 * @param {RenewableMode} mode
 * @param {(acc: Object<string,string>, d: StatsData) => Object<string,string>} [colourReducer]
 * @param {RenewableSmoothing} [smoothing]
 * @param {RenewableValueType} [valueType]
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
	valueType = 'percentage'
) {
	const fueltechStats = input?.fueltechStats ?? [];
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
		// Same calculation as `current`, different data source.
		statsDatasets = buildCurrentStats(legacyFueltechStats);
	} else if (mode === 'current') {
		statsDatasets = buildCurrentStats(fueltechStats);
	} else if (mode === 'current_gross_demand') {
		statsDatasets = buildCurrentGrossDemandStats(fueltechStats, marketStats);
	} else if (mode === 'oe_proportion') {
		statsDatasets = buildOeProportionStats(marketStats);
	} else if (mode === 'oe_with_storage') {
		statsDatasets = buildOeWithStorageStats(marketStats, fueltechStats);
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
		colourReducer
	).transform();

	if (smoothing === 'rolling12mth') {
		ts.calculate12MthRollingSum();
	}

	if (valueType === 'percentage') {
		ts.convertToPercentage(TOTAL_ID);
	}

	const seriesNames =
		valueType === 'percentage'
			? ts.seriesNames.filter((/** @type {string} */ name) => name !== TOTAL_ID)
			: ts.seriesNames;

	return {
		dataset: ts.data,
		statsDatasets,
		seriesNames,
		seriesColours: ts.seriesColours,
		seriesLabels: ts.seriesLabels
	};
}

/**
 * Mode `current` — preserves existing infographic behaviour.
 * Aligns fueltech series (Statistic.group requires equal lengths), groups them
 * into fossil_fuels / renewables, and uses generation-minus-loads as the total.
 *
 * @param {StatsData[]} fueltechStats
 * @returns {StatsData[]}
 */
function buildCurrentStats(fueltechStats) {
	if (!fueltechStats || fueltechStats.length === 0) return [];
	const aligned = alignStatsDataToCommonRange(fueltechStats);
	const stats = new Statistic(aligned, 'history')
		.group(DOMAIN_GROUPS)
		.addTotalMinusLoads(LOAD_FUEL_TECHS, TOTAL_ID);
	return stats.data;
}

/**
 * Mode `current_gross_demand` — local fueltech grouping but with the OE
 * gross-demand metric as the denominator. Lets you compare apples-to-apples
 * with the OE methods on the same denominator.
 *
 * @param {StatsData[]} fueltechStats
 * @param {StatsData[]} marketStats
 * @returns {StatsData[]}
 */
function buildCurrentGrossDemandStats(fueltechStats, marketStats) {
	if (!fueltechStats || fueltechStats.length === 0) return [];
	const demand = findByDataType(marketStats, METRIC.demand);
	if (!demand) return [];

	const aligned = alignStatsDataToCommonRange(fueltechStats);
	const grouped = new Statistic(aligned, 'history').group(DOMAIN_GROUPS);

	// Replace the auto-generated total with demand_gross_energy as au-total.
	const meta = {
		start: demand.history.start,
		last: demand.history.last,
		interval: demand.history.interval
	};

	return [...grouped.data, makeTotalStats(TOTAL_ID, [...demand.history.data], meta)];
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
	const sources = nonRenewable ? [renewable, nonRenewable, demand] : [renewable, demand];
	const aligned = alignStatsDataToCommonRange(sources);
	const alignedRenewable = aligned[0];
	const alignedNonRenewable = nonRenewable ? aligned[1] : null;
	const alignedDemand = nonRenewable ? aligned[2] : aligned[1];

	const renewablesRaw = alignedRenewable.history.data;
	const demandRaw = alignedDemand.history.data;
	const fossilRaw = alignedNonRenewable
		? alignedNonRenewable.history.data
		: subtractArrays(demandRaw, renewablesRaw);

	const { arrays, meta } = trimSharedNulls([fossilRaw, renewablesRaw, demandRaw], {
		start: alignedDemand.history.start,
		last: alignedDemand.history.last,
		interval: alignedDemand.history.interval
	});
	const [fossilData, renewablesData, demandData] = arrays;

	const fossilLabel = alignedNonRenewable
		? 'Fossils (renewable=false bucket)'
		: 'Fossils (derived: gross demand − renewable)';

	return [
		makeGroupedStats(FOSSIL_ID, 'fossil_fuels', fossilData, meta, fossilLabel),
		makeGroupedStats(RENEWABLES_ID, 'renewables', renewablesData, meta),
		makeTotalStats(TOTAL_ID, demandData, meta)
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

	const [alignedRenewable, alignedDemand] = alignStatsDataToCommonRange([renewable, demand]);
	const renewablesRaw = alignedRenewable.history.data;
	const demandRaw = alignedDemand.history.data;
	const fossilRaw = subtractArrays(demandRaw, renewablesRaw);

	const { arrays, meta } = trimSharedNulls([fossilRaw, renewablesRaw, demandRaw], {
		start: alignedDemand.history.start,
		last: alignedDemand.history.last,
		interval: alignedDemand.history.interval
	});
	const [fossilData, renewablesData, demandData] = arrays;

	return [
		makeGroupedStats(
			FOSSIL_ID,
			'fossil_fuels',
			fossilData,
			meta,
			'Fossils (derived: gross demand − renewable)'
		),
		makeGroupedStats(RENEWABLES_ID, 'renewables', renewablesData, meta),
		makeTotalStats(TOTAL_ID, demandData, meta)
	];
}

/**
 * Mode `oe_with_storage` — OE proportion with battery discharge added to the
 * renewable numerator. Implements the storage-inclusive variant from
 * https://docs.openelectricity.org.au/guides/renewables.
 *
 * SDK v0.8.1 does not expose `renewable_with_storage_proportion`, so we derive
 * locally. NOTE: pumped-hydro discharge is not a separate fueltech in this
 * dataset (`pumps` represents pumping load), so this approximation under-counts
 * pumped-hydro storage relative to the official metric. TODO: revisit when the
 * SDK exposes the metric directly.
 *
 * @param {StatsData[]} marketStats
 * @param {StatsData[]} fueltechStats
 * @returns {StatsData[]}
 */
function buildOeWithStorageStats(marketStats, fueltechStats) {
	const renewable = findByDataType(marketStats, METRIC.renewable);
	const demand = findByDataType(marketStats, METRIC.demand);
	const battery = fueltechStats.find((d) => d.fuel_tech === 'battery_discharging');
	if (!renewable || !demand) return [];

	const sources = battery ? [renewable, demand, battery] : [renewable, demand];
	const aligned = alignStatsDataToCommonRange(sources);
	const alignedRenewable = aligned[0];
	const alignedDemand = aligned[1];
	const alignedBattery = battery ? aligned[2] : null;

	const renewablePlusStorageRaw = alignedBattery
		? addArrays(alignedRenewable.history.data, alignedBattery.history.data)
		: [...alignedRenewable.history.data];
	const demandRaw = alignedDemand.history.data;
	const fossilRaw = subtractArrays(demandRaw, renewablePlusStorageRaw);

	const { arrays, meta } = trimSharedNulls(
		[fossilRaw, renewablePlusStorageRaw, demandRaw],
		{
			start: alignedDemand.history.start,
			last: alignedDemand.history.last,
			interval: alignedDemand.history.interval
		}
	);
	const [fossilData, renewablePlusStorage, demandData] = arrays;

	return [
		makeGroupedStats(
			FOSSIL_ID,
			'fossil_fuels',
			fossilData,
			meta,
			'Fossils (derived: gross demand − renewable − battery)'
		),
		makeGroupedStats(RENEWABLES_ID, 'renewables', renewablePlusStorage, meta),
		makeTotalStats(TOTAL_ID, demandData, meta)
	];
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
 * Trim leading/trailing months where ANY of the supplied arrays is null.
 * Returns the trimmed arrays + an updated meta whose `start` reflects the
 * first kept month. Required because MultiLine builds an SVG path by joining
 * `x,y` pairs — a single `null` value renders as `NaN` and invalidates the
 * entire path, so the line disappears.
 *
 * @param {Array<number | null>[]} arrays
 * @param {{ start: string, last: string, interval: string }} meta
 * @returns {{ arrays: Array<number | null>[], meta: { start: string, last: string, interval: string } }}
 */
function trimSharedNulls(arrays, meta) {
	if (arrays.length === 0) return { arrays, meta };
	const len = arrays[0].length;

	let firstValid = 0;
	while (firstValid < len && arrays.some((a) => a[firstValid] == null)) firstValid++;

	let lastValid = len - 1;
	while (lastValid >= firstValid && arrays.some((a) => a[lastValid] == null)) lastValid--;

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
		...(label ? { label } : {}),
		history: { ...meta, data }
	});
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
 * @param {Array<number | null>} a
 * @param {Array<number | null>} b
 * @returns {Array<number | null>}
 */
function addArrays(a, b) {
	const len = Math.max(a.length, b.length);
	const out = /** @type {Array<number | null>} */ (new Array(len));
	for (let i = 0; i < len; i++) {
		const av = a[i];
		const bv = b[i];
		if (av == null && bv == null) out[i] = null;
		else out[i] = (av ?? 0) + (bv ?? 0);
	}
	return out;
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
