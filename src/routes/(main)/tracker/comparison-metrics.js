import { TABLE_UNIT_CYCLES, nextTableUnitPrefix } from './table-units.js';
import { formatTableEnergy, formatTableIntensity } from './table-format.js';
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
/** `exBatteries` marks the renewables presentations that sum OE's renewable
 * fuel technologies (`RENEWABLE_FUELS`) instead of the official
 * `generation_renewable_energy`, which also counts battery discharge.
 * @type {Array<{id:string,label:string,shortLabel:string,group:string,kind:string,fuel?:string,exBatteries?:boolean}>} */
export const COMPARISON_METRICS = [
	{
		id: 'intensity',
		label: 'Carbon intensity',
		shortLabel: 'Intensity',
		group: 'Emissions',
		kind: 'intensity'
	},
	...generation.map((fuel) => ({
		id: fuel === 'renewables' ? 'generation' : `${fuel}_generation`,
		fuel,
		label: `${labels[fuel]} generation`,
		shortLabel: labels[fuel],
		group: 'Generation',
		kind: 'energy'
	})),
	{
		id: 'generation_ex_batteries',
		fuel: 'renewables',
		exBatteries: true,
		label: 'Renewables generation excl. batteries',
		shortLabel: 'Renewables excl. batteries',
		group: 'Generation',
		kind: 'energy'
	},
	{
		id: 'net_imports_share',
		label: 'Net imports proportion',
		shortLabel: 'Net imports',
		group: 'Proportion',
		kind: 'share'
	},
	...generation.map((fuel) => ({
		id: fuel === 'renewables' ? 'share' : `${fuel}_share`,
		fuel,
		label: `${labels[fuel]} proportion`,
		shortLabel: labels[fuel],
		group: 'Proportion',
		kind: 'share'
	})),
	{
		id: 'share_ex_batteries',
		fuel: 'renewables',
		exBatteries: true,
		label: 'Renewables proportion excl. batteries',
		shortLabel: 'Renewables excl. batteries',
		group: 'Proportion',
		kind: 'share'
	},
	...['solar', 'wind', 'hydro', 'gas', 'coal'].map((fuel) => ({
		id: `${fuel}_value`,
		fuel,
		label: `${labels[fuel]} value`,
		shortLabel: `${labels[fuel]} value`,
		group: 'Prices',
		kind: 'price'
	})),
	{
		id: 'price',
		label: 'Volume-weighted price',
		shortLabel: 'VW price',
		group: 'Prices',
		kind: 'price'
	},
	{
		id: 'price_real',
		label: 'Volume-weighted price (inflation adjusted)',
		shortLabel: 'Real VW price',
		group: 'Prices',
		kind: 'price'
	}
];
export const ALL_COMPARISON_CHARTS = COMPARISON_METRICS.map((metric) => metric.id);
export const DEFAULT_COMPARISON_CHARTS = ['intensity', 'share'];
/** Paired metrics share one selectable chart and retain their chosen presentation. */
export function comparisonChartId(/** @type {string} */ id) {
	if (id === 'price') return 'price_real';
	const metric = comparisonMetric(id);
	return metric.kind === 'energy' || metric.exBatteries
		? comparisonFuelMetric(metric.fuel ?? '')
		: id;
}
/** A fuel chart's metric for a presentation: its proportion or generation,
 * and for renewables the official figure or the sum excluding batteries.
 * @param {string} fuel @param {{generation?: boolean, exBatteries?: boolean}} [presentation] */
export function comparisonFuelMetric(fuel, { generation = false, exBatteries = false } = {}) {
	const kind = generation ? 'generation' : 'share';
	if (fuel !== 'renewables') return `${fuel}_${kind}`;
	return exBatteries ? `${kind}_ex_batteries` : kind;
}
export const COMPARISON_CHART_OPTIONS = COMPARISON_METRICS.filter(
	(metric) => metric.kind !== 'energy' && metric.id !== 'price' && !metric.exBatteries
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
/** A chart's URL name: hyphenated, with each proportion named by its fuel
 * alone and renewables named in full (`intensity`, `renewables`,
 * `solar-wind-generation`, `net-imports`, `price-real`).
 * @param {string} id */
export function comparisonChartSlug(id) {
	if (id === 'share') return 'renewables';
	if (id === 'generation') return 'renewables-generation';
	if (id === 'share_ex_batteries') return 'renewables-ex-batteries';
	if (id === 'generation_ex_batteries') return 'renewables-ex-batteries-generation';
	return id.replace(/_share$/, '').replaceAll('_', '-');
}
const CHARTS_BY_SLUG = new Map(COMPARISON_METRICS.map(({ id }) => [comparisonChartSlug(id), id]));
/** The metric id a URL name stands for; ids themselves (older links) pass
 * through, and anything else is left for normalisation to drop.
 * @param {string} slug */
export function comparisonChartFromSlug(slug) {
	return CHARTS_BY_SLUG.get(slug) ?? slug;
}
/** Preserve each selected chart's presentation when applying the chart picker. */
export function selectComparisonCharts(
	/** @type {string[]} */ ids,
	/** @type {string[]} */ previous = []
) {
	return ids.map((id) => previous.find((value) => comparisonChartId(value) === id) ?? id);
}
/** @param {string} id */
export const comparisonMetric = (id) =>
	COMPARISON_METRICS.find((metric) => metric.id === id) ?? COMPARISON_METRICS[0];
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
/** Renewables excluding batteries, or null when any of its fuels is missing.
 * @param {Record<string, any> | undefined} row */
function renewablesExBatteries(row) {
	const values = RENEWABLE_FUELS.map((fuel) => row?.[`${fuel}_energy`]);
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
 * A Regions table cell. Generation and intensity render in their header's
 * unit with the fuel-tech table's precision; the rest as `formatComparisonValue`.
 * @param {number | null | undefined} value @param {string} id @param {TableUnits} units
 */
export function formatComparisonCell(value, id, units) {
	const key = comparisonUnitKey(id);
	if (key === 'energy')
		return formatTableEnergy(value, units.energy ?? COMPARISON_TABLE_UNITS.energy);
	if (key === 'intensity')
		return formatTableIntensity(value, units.intensity ?? COMPARISON_TABLE_UNITS.intensity);
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
 * How Compare reads a provider series' gaps. Its life runs from its first
 * reading to its last, as calendar label times (`first` is Infinity when it has
 * none): the API pads a technology's series with nulls before it starts and
 * after it retires, and those months are absent, not missing. Inside its life,
 * a technology that `idles` (reports explicit zeros elsewhere, as peakers do)
 * also reports some idle months as null, so its nulls count as zero; for any
 * other technology a null is a missing observation (SA wind, May 2008 – June
 * 2009).
 * @param {Array<[string, number | null]> | undefined} data
 */
export function seriesSpan(data) {
	const readings = (data ?? []).filter(([, value]) => Number.isFinite(value));
	const times = readings.map(([stamp]) => calendarLabelMs(stamp));
	return {
		first: Math.min(...times),
		last: Math.max(...times),
		idles: readings.some(([, value]) => value === 0)
	};
}
/** @param {string} tech @param {string} fuel */
export function matchesComparisonFuel(tech, fuel) {
	return tech === fuel || tech.startsWith(`${fuel}_`);
}
/** @param {ComparisonResponse} response @param {'energy'|'market_value'} metric
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
			...seriesSpan(series.data)
		};
	});
	const times = [...new Set(entries.flatMap((entry) => [...entry.values.keys()]))]
		.filter(Number.isFinite)
		.sort((a, b) => a - b);
	return times.map((time) => {
		/** @param {typeof entries} members */
		const sum = (members) => {
			if (!members.length) return 0;
			// A technology absent at this date, or idle, contributes zero; a missing
			// observation invalidates the group instead of silently understating it.
			const values = members
				.filter((entry) => time >= entry.first && time <= entry.last)
				.map((entry) => {
					const value = entry.values.get(time);
					return Number.isFinite(value) || !entry.idles ? value : 0;
				});
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
	const data = comparisonFuelRows(response, 'market_value');
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
