import { TABLE_UNIT_CYCLES, nextTableUnitPrefix } from './table-units.js';
import {
	formatTableEnergy,
	formatTableIntensity,
	formatTablePercentage,
	formatTablePrice
} from './table-format.js';
/** @typedef {{data?:Array<{metric:string,results?:Array<{name?:string,columns?:{fueltech?:string},data?:Array<[string,number|null]>}>}>}} ComparisonResponse */
/** Shared chart, table and export definitions for regional comparisons. */
const generation = ['renewables', 'solar_wind', 'solar', 'wind', 'gas', 'coal'];
/** @type {Record<string,string>} */
const labels = {
	renewables: 'Renewables',
	solar_wind: 'Solar + Wind',
	solar: 'Solar',
	wind: 'Wind',
	gas: 'Gas',
	coal: 'Coal',
	hydro: 'Hydro'
};
/**
 * Every metric Compare can draw. Each belongs to one picker `chart`, whose own
 * id names its default presentation, and is one presentation of it along the
 * `PRESENTATIONS` axes: `generation` rather than proportion; `exBatteries`,
 * summing OE's renewable fuel technologies (`RENEWABLE_FUELS`) rather than the
 * official `generation_renewable_energy`, which counts battery discharge; or
 * `nominal` rather than inflation-adjusted dollars. Picker entries, URL names
 * and each card's header switches all follow from these fields.
 * @typedef {{id: string, chart: string, label: string, shortLabel: string, group: string,
 *   kind: string, fuel?: string, generation?: boolean, exBatteries?: boolean, nominal?: boolean}} ComparisonMetric
 */
/** @type {ComparisonMetric[]} */
export const COMPARISON_METRICS = [
	{
		id: 'intensity',
		chart: 'intensity',
		label: 'Carbon intensity',
		shortLabel: 'Intensity',
		group: 'Emissions',
		kind: 'intensity'
	},
	...generation.map((fuel) => ({
		id: `${fuel}_generation`,
		chart: `${fuel}_share`,
		generation: true,
		fuel,
		label: `${labels[fuel]} generation`,
		shortLabel: labels[fuel],
		group: 'Generation',
		kind: 'energy'
	})),
	{
		id: 'renewables_generation_ex_batteries',
		chart: 'renewables_share',
		generation: true,
		exBatteries: true,
		fuel: 'renewables',
		label: 'Renewables generation excl. batteries',
		shortLabel: 'Renewables excl. batteries',
		group: 'Generation',
		kind: 'energy'
	},
	{
		id: 'net_imports_share',
		chart: 'net_imports_share',
		label: 'Net imports proportion',
		shortLabel: 'Net imports',
		group: 'Proportion',
		kind: 'share'
	},
	...generation.map((fuel) => ({
		id: `${fuel}_share`,
		chart: `${fuel}_share`,
		fuel,
		label: `${labels[fuel]} proportion`,
		shortLabel: labels[fuel],
		group: 'Proportion',
		kind: 'share'
	})),
	{
		id: 'renewables_share_ex_batteries',
		chart: 'renewables_share',
		exBatteries: true,
		fuel: 'renewables',
		label: 'Renewables proportion excl. batteries',
		shortLabel: 'Renewables excl. batteries',
		group: 'Proportion',
		kind: 'share'
	},
	...['solar', 'wind', 'hydro', 'gas', 'coal'].map((fuel) => ({
		id: `${fuel}_value`,
		chart: `${fuel}_value`,
		fuel,
		label: `${labels[fuel]} value`,
		shortLabel: `${labels[fuel]} value`,
		group: 'Prices',
		kind: 'price'
	})),
	{
		id: 'price',
		chart: 'price_real',
		nominal: true,
		label: 'Volume-weighted price',
		shortLabel: 'VW price',
		group: 'Prices',
		kind: 'price'
	},
	{
		id: 'price_real',
		chart: 'price_real',
		label: 'Volume-weighted price (inflation adjusted)',
		shortLabel: 'Real VW price',
		group: 'Prices',
		kind: 'price'
	}
];
export const ALL_COMPARISON_CHARTS = COMPARISON_METRICS.map((metric) => metric.id);
export const DEFAULT_COMPARISON_CHARTS = ['intensity', 'renewables_share'];
const METRICS_BY_ID = new Map(COMPARISON_METRICS.map((metric) => [metric.id, metric]));
/** @param {string} id */
export const comparisonMetric = (id) => METRICS_BY_ID.get(id) ?? COMPARISON_METRICS[0];
/** The picker chart a metric presents; an unknown id stands for itself.
 * @param {string} id */
export function comparisonChartId(id) {
	return METRICS_BY_ID.get(id)?.chart ?? id;
}

/** @typedef {'generation' | 'exBatteries' | 'nominal'} PresentationKey */
/**
 * The axes a chart's presentations switch along, as its card header shows
 * them: proportion or generation tabs, and toggles. `checkedWhenOff` toggles
 * read the other way round (inflation adjusted is the default).
 * @type {Array<{key: PresentationKey, control: 'tabs', labels: [string, string]} |
 *   {key: PresentationKey, control: 'toggle', label: string, checkedWhenOff?: boolean}>}
 */
export const PRESENTATIONS = [
	{ key: 'generation', control: 'tabs', labels: ['Proportion', 'Generation'] },
	{ key: 'exBatteries', control: 'toggle', label: 'Excl. batteries' },
	{ key: 'nominal', control: 'toggle', label: 'Inflation adjusted', checkedWhenOff: true }
];
/** The presentation axes a chart varies along. @param {string} chart */
export function comparisonPresentations(chart) {
	return PRESENTATIONS.filter(({ key }) =>
		COMPARISON_METRICS.some((metric) => metric.chart === chart && metric[key])
	);
}
/** The same chart's metric with one presentation axis switched on or off, the
 * others kept; the metric itself when no such presentation exists.
 * @param {string} id @param {PresentationKey} key @param {boolean} on */
export function comparisonPresentation(id, key, on) {
	const metric = comparisonMetric(id);
	const match = COMPARISON_METRICS.find(
		(candidate) =>
			candidate.chart === metric.chart &&
			PRESENTATIONS.every(
				(axis) => !!candidate[axis.key] === (axis.key === key ? on : !!metric[axis.key])
			)
	);
	return match?.id ?? id;
}
export const COMPARISON_CHART_OPTIONS = COMPARISON_METRICS.filter(
	(metric) => metric.id === metric.chart
).map((metric) => ({
	...metric,
	label:
		metric.id === 'price_real'
			? 'Volume-weighted price'
			: metric.kind === 'share' && metric.fuel
				? labels[metric.fuel]
				: metric.label,
	group: metric.kind === 'share' ? 'Generation / Proportion' : metric.group
}));
export const COMPARISON_METRIC_GROUPS = [
	...new Set(COMPARISON_CHART_OPTIONS.map((metric) => metric.group))
];
/** A chart's URL name: its id hyphenated, with proportions named by their
 * subject alone (`intensity`, `renewables`, `solar-wind-generation`,
 * `renewables-ex-batteries`, `net-imports`, `price-real`).
 * @param {string} id */
export function comparisonChartSlug(id) {
	return id.replace('_share', '').replaceAll('_', '-');
}
const CHARTS_BY_SLUG = new Map(COMPARISON_METRICS.map(({ id }) => [comparisonChartSlug(id), id]));
/** Renewables' ids before they followed the other fuels' pattern. */
const LEGACY_IDS = /** @type {Record<string, string>} */ ({
	share: 'renewables_share',
	generation: 'renewables_generation'
});
/** The metric id a URL name stands for. Ids themselves (older links) pass
 * through, renewables' earlier ids map to their current ones, and anything
 * else is left for normalisation to drop.
 * @param {string} slug */
export function comparisonChartFromSlug(slug) {
	return CHARTS_BY_SLUG.get(slug) ?? LEGACY_IDS[slug] ?? slug;
}
/** Preserve each selected chart's presentation when applying the chart picker. */
export function selectComparisonCharts(
	/** @type {string[]} */ ids,
	/** @type {string[]} */ previous = []
) {
	return ids.map((id) => previous.find((value) => comparisonChartId(value) === id) ?? id);
}
/** @param {string} id @param {string} basis @param {boolean} [base] */
export function comparisonUnit(id, basis, base = false) {
	const metric = comparisonMetric(id);
	if (metric.kind === 'energy') return base ? 'MWh' : 'GWh';
	if (metric.kind === 'intensity') return 'kgCO₂e/MWh';
	if (metric.kind === 'price') return '$/MWh';
	return `% ${id === 'net_imports_share' || basis === 'demand' ? 'demand' : 'generation'}`;
}
export const FUEL_COMPONENTS = ['solar', 'wind', 'hydro', 'bioenergy', 'gas', 'coal'];
/** OE's renewable fuel technologies (its `renewable=true` grouping): solar
 * (utility and rooftop), wind, hydro (pumped-hydro output included, as OE
 * classes it) and bioenergy — no battery discharge or pumping. */
export const RENEWABLE_FUELS = ['solar', 'wind', 'hydro', 'bioenergy'];
const RENEWABLE_ENERGY_KEYS = RENEWABLE_FUELS.map((fuel) => `${fuel}_energy`);
/** Renewables excluding batteries, or null when any of its fuels is missing.
 * @param {Record<string, any> | undefined} row */
function renewablesExBatteries(row) {
	const values = RENEWABLE_ENERGY_KEYS.map((key) => row?.[key]);
	return values.every(Number.isFinite) ? values.reduce((a, b) => a + b, 0) : null;
}
/** Display value for the Regions table and stripes tooltips: one decimal,
 * energy in GWh, missing readings as an em dash.
 * @param {number | null | undefined} value @param {string} id */
export function formatComparisonValue(value, id) {
	if (!Number.isFinite(value)) return '—';
	const shown = comparisonMetric(id).kind === 'energy' ? Number(value) / 1000 : Number(value);
	return shown.toLocaleString('en-AU', { maximumFractionDigits: 1 });
}

/** @typedef {import('./table-units.js').TableUnits} TableUnits */
/** The Regions table's resting units: generation in GWh, intensity in kg. */
const COMPARISON_TABLE_UNITS = /** @type {const} */ ({ energy: 'G', intensity: 'k' });
/** The SI cycle a metric's table column steps through, if any.
 * @param {string} id @returns {'energy' | 'intensity' | null} */
function comparisonUnitKey(id) {
	const { kind } = comparisonMetric(id);
	return kind === 'energy' || kind === 'intensity' ? kind : null;
}
/**
 * A Regions table cell, formatted as the fuel-tech table formats the same
 * kind of value: generation and intensity in their header's unit, shares to
 * one decimal with % (`42.0%`) and prices with cents (`$85.30`). Price
 * tooltips use it too, so chart and table read the same.
 * @param {number | null | undefined} value @param {string} id @param {TableUnits} units
 */
export function formatComparisonCell(value, id, units) {
	const key = comparisonUnitKey(id);
	if (key === 'energy')
		return formatTableEnergy(value, units.energy ?? COMPARISON_TABLE_UNITS.energy);
	if (key === 'intensity')
		return formatTableIntensity(value, units.intensity ?? COMPARISON_TABLE_UNITS.intensity);
	const { kind } = comparisonMetric(id);
	if (kind === 'share') return formatTablePercentage(value);
	if (kind === 'price') return formatTablePrice(value);
	return formatComparisonValue(value, id);
}
/**
 * A Regions table column header, as the fuel-tech table's headers work:
 * generation and intensity step through their SI prefixes, proportions toggle
 * their percentage basis (net imports are always a share of demand), and
 * prices have a single unit. `change` is what a click applies.
 * @param {string} id @param {'demand' | 'generation'} basis @param {TableUnits} units
 * @returns {{unit: string, nextUnit?: string,
 *   change?: {units: TableUnits} | {basis: 'demand' | 'generation'}}}
 */
export function comparisonTableColumn(id, basis, units) {
	const key = comparisonUnitKey(id);
	if (key) {
		const prefix = units[key] ?? COMPARISON_TABLE_UNITS[key];
		const next = nextTableUnitPrefix(key, prefix);
		const { label } = TABLE_UNIT_CYCLES[key];
		return {
			unit: label(prefix),
			nextUnit: label(next),
			change: { units: { ...units, [key]: next } }
		};
	}
	const unit = comparisonUnit(id, basis);
	if (comparisonMetric(id).kind !== 'share' || id === 'net_imports_share') return { unit };
	const next = basis === 'demand' ? 'generation' : 'demand';
	return { unit, nextUnit: comparisonUnit(id, next), change: { basis: next } };
}

/**
 * A provider timestamp read as a calendar label: the local wall-clock date
 * taken as UTC, so NEM and WEM months share one synthetic axis instead of
 * being shifted apart by their offsets.
 * @param {unknown} stamp - e.g. '2026-07-01T00:00:00+10:00'
 */
export function calendarLabelMs(stamp) {
	return Date.parse(String(stamp).slice(0, 19) + 'Z');
}
/**
 * A provider response with its gaps read the way Compare reads them, applied
 * once where responses are processed. The API pads a technology's series with
 * nulls before it starts and after it retires: those months are absent, so
 * they are dropped. Inside its life, a technology that idles (reports explicit
 * zeros elsewhere, as peakers do) also reports some idle months as null, so
 * those become zero. Any other null stays: a missing reading (SA wind, May
 * 2008 – June 2009).
 * @template {ComparisonResponse} Response @param {Response} response @returns {Response}
 */
export function normaliseComparisonResponse(response) {
	return {
		...response,
		data: response?.data?.map((entry) => ({
			...entry,
			results: entry.results?.map((series) => ({ ...series, data: readSeries(series.data) }))
		}))
	};
}
/** @param {Array<[string, number | null]> | undefined} data */
function readSeries(data = []) {
	const observed = (/** @type {[string, number | null]} */ [, value]) => Number.isFinite(value);
	const first = data.findIndex(observed);
	if (first < 0) return [];
	const last = data.findLastIndex(observed);
	const life = data.slice(first, last + 1);
	if (!life.some(([, value]) => value === 0)) return life;
	return life.map(([stamp, value]) => [stamp, Number.isFinite(value) ? value : 0]);
}
/** @param {string} tech @param {string} fuel */
export function matchesComparisonFuel(tech, fuel) {
	return tech === fuel || tech.startsWith(`${fuel}_`);
}
/** Per-fuel sums of a normalised response (`normaliseComparisonResponse`).
 * @param {ComparisonResponse} response @param {'energy'|'market_value'} metric
 * @returns {Array<{time:number,date:Date} & Record<string,any>>} */
export function comparisonFuelRows(response, metric) {
	const series = (response?.data ?? [])
		.filter((entry) => entry.metric === metric)
		.flatMap((entry) => entry.results ?? [])
		.filter((series) => (series.columns?.fueltech ?? series.name) !== 'battery');
	if (!series.length) return [];
	const entries = series.map((series) => {
		const values = new Map(
			(series.data ?? []).map(([stamp, value]) => [calendarLabelMs(stamp), value])
		);
		return {
			tech: series.columns?.fueltech ?? series.name ?? '',
			values,
			first: Math.min(...values.keys()),
			last: Math.max(...values.keys())
		};
	});
	const times = [...new Set(entries.flatMap((entry) => [...entry.values.keys()]))]
		.filter(Number.isFinite)
		.sort((a, b) => a - b);
	return times.map((time) => {
		/** @param {typeof entries} members */
		const sum = (members) => {
			if (!members.length) return 0;
			// A technology absent at this date contributes zero; a missing
			// observation invalidates the group instead of silently understating it.
			const values = members
				.filter((entry) => time >= entry.first && time <= entry.last)
				.map((entry) => entry.values.get(time));
			return values.every(Number.isFinite) ? values.map(Number).reduce((a, b) => a + b, 0) : null;
		};
		return {
			time,
			date: new Date(time),
			...Object.fromEntries(
				FUEL_COMPONENTS.map((fuel) => [
					`${fuel}_${metric}`,
					sum(entries.filter((entry) => matchesComparisonFuel(entry.tech, fuel)))
				])
			),
			...(metric === 'market_value' ? { market_value: sum(entries) } : {})
		};
	});
}
/** @param {ComparisonResponse} response */
export function processComparisonFinancial(response) {
	const data = comparisonFuelRows(normaliseComparisonResponse(response), 'market_value');
	return data.length
		? {
				data,
				seriesNames: [...FUEL_COMPONENTS.map((fuel) => `${fuel}_market_value`), 'market_value'],
				seriesLabels: {},
				seriesColours: {}
			}
		: null;
}
/** @param {ComparisonResponse} response */
export function processComparisonFlows(response) {
	const series = (response?.data ?? []).flatMap((entry) =>
		(entry.results ?? []).map((series) => ({
			metric: entry.metric,
			values: new Map((series.data ?? []).map(([stamp, value]) => [calendarLabelMs(stamp), value]))
		}))
	);
	const times = [...new Set(series.flatMap((entry) => [...entry.values.keys()]))].sort(
		(a, b) => a - b
	);
	return {
		data: times.map((time) => {
			const imports = series
				.filter((entry) => entry.metric === 'flow_imports_energy')
				.map((entry) => entry.values.get(time));
			const exports = series
				.filter((entry) => entry.metric === 'flow_exports_energy')
				.map((entry) => entry.values.get(time));
			return {
				time,
				date: new Date(time),
				net_imports:
					imports.length && exports.length && [...imports, ...exports].every(Number.isFinite)
						? imports.map(Number).reduce((a, b) => a + Math.abs(Number(b)), 0) -
							exports.map(Number).reduce((a, b) => a + Math.abs(Number(b)), 0)
						: null
			};
		}),
		seriesNames: ['net_imports'],
		seriesLabels: {},
		seriesColours: {}
	};
}
/** @param {any} row @param {string} id @param {string} basis */
export function comparisonMetricValue(row, id, basis) {
	const ratio = (/** @type {number} */ a, /** @type {number} */ b, scale = 1) =>
		Number.isFinite(a) && Number.isFinite(b) && b > 0 ? (a / b) * scale : null;
	const sum = (/** @type {number} */ a, /** @type {number} */ b) =>
		Number.isFinite(a) && Number.isFinite(b) ? a + b : null;
	const metric = comparisonMetric(id);
	const fuel = metric.fuel;
	const energy =
		fuel === 'renewables'
			? metric.exBatteries
				? renewablesExBatteries(row)
				: row?.renewables
			: fuel === 'solar_wind'
				? sum(row?.solar_energy, row?.wind_energy)
				: row?.[`${fuel}_energy`];
	if (id === 'intensity') return ratio(row?.emissions, row?.energy_mwh, 1000);
	if (id === 'price' || id === 'price_real')
		return ratio(row?.[id === 'price' ? 'market_value' : 'market_value_real'], row?.energy_mwh);
	if (id === 'net_imports_share') return ratio(row?.net_imports, row?.demand_gross, 100);
	const kind = metric.kind;
	if (kind === 'energy') return Number.isFinite(energy) ? energy : null;
	if (kind === 'price') return ratio(row?.[`${fuel}_market_value`], energy);
	return ratio(energy, basis === 'generation' ? row?.generation_mwh : row?.demand_gross, 100);
}
