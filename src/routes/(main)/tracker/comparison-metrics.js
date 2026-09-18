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
/** @type {Array<{id:string,label:string,shortLabel:string,group:string,kind:string,fuel?:string}>} */
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
	return metric.kind === 'energy'
		? metric.fuel === 'renewables'
			? 'share'
			: `${metric.fuel}_share`
		: id;
}
export const COMPARISON_CHART_OPTIONS = COMPARISON_METRICS.filter(
	(metric) => metric.kind !== 'energy' && metric.id !== 'price'
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
export const FUEL_COMPONENTS = ['solar', 'wind', 'hydro', 'gas', 'coal'];
/** Display value for the Regions table and stripes tooltips: one decimal,
 * energy in GWh, missing readings as an em dash.
 * @param {number | null | undefined} value @param {string} id */
export function formatComparisonValue(value, id) {
	if (!Number.isFinite(value)) return '—';
	const shown = comparisonMetric(id).kind === 'energy' ? Number(value) / 1000 : Number(value);
	return shown.toLocaleString('en-AU', { maximumFractionDigits: 1 });
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
			// A technology absent at this date contributes zero; an explicit missing
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
			? row?.renewables
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
