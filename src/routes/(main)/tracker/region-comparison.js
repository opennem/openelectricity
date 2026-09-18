import { bisectTime, bisectTimeRight } from '$lib/components/charts/v2/binary-search.js';
import { computeYDomain } from '$lib/components/charts/v2/compute-y-domain.js';
import {
	COMPARISON_CHART_OPTIONS,
	DEFAULT_COMPARISON_CHARTS,
	calendarLabelMs,
	comparisonChartId,
	FUEL_COMPONENTS,
	comparisonFuelRows,
	comparisonMetricValue
} from './comparison-metrics.js';
import { allRegionsOption, regionOptions } from '$lib/regions.js';
import { EARLIEST_DATA_MS } from '$lib/utils/date-range.js';
import { getGroup, loadGroupsFor } from '$lib/components/charts/network/groups.js';
import { contributionSeries } from '$lib/components/charts/network/contribution.js';
import { processEmissionsIntensity } from '$lib/components/charts/network/process-emissions-intensity.js';
import { processNetworkData } from '$lib/components/charts/network/process-network-data.js';
import { rollingSum12MonthRows } from '$lib/components/charts/v2/dataProcessing.js';

export const COMPARISON_REGIONS = [
	...regionOptions
		.filter((region) => region.value !== '_all')
		.map((region) => ({
			...region,
			shortLabel: region.value === 'wem' ? 'WA (WEM)' : region.shortLabel
		})),
	regionOptions[0],
	{ ...allRegionsOption, label: 'All Regions (NEM + WEM)', shortLabel: 'All Regions' }
];
/** The shortest comparison window — one full year of periods. */
export const COMPARISON_MIN_SPAN_MS = 366 * 86_400_000;
/** The daily interval always shows exactly one year of days. */
export const DAILY_WINDOW_MS = 365 * 86_400_000;
/** Monthly and rolling intervals open on the latest five years. */
export const DEFAULT_MONTHLY_SPAN_MONTHS = 60;
/** Below three years the axis shows months as well as years. */
export const MONTH_TICKS_BELOW_MS = 3 * 365 * 86_400_000;
export const DEFAULT_COMPARISON_REGIONS = COMPARISON_REGIONS.slice(0, 6).map((r) => r.value);
export const COMPARISON_INTERVALS = [
	{ value: '1d', label: 'Daily' },
	{ value: '12mr', label: '12-month rolling' },
	{ value: '1M', label: 'Monthly' },
	{ value: '1y', label: 'Calendar year' },
	{ value: 'fy', label: 'Financial year' }
];

/** @typedef {'charts' | 'stripes'} ComparisonDisplay */
/** @typedef {{charts: string[], display: ComparisonDisplay, interval: string, regions: string[], mode: 'generation' | 'share', basis: 'demand' | 'generation', start: number | null, end: number | null, table: boolean | null}} RegionComparisonSelection */
/** Unvalidated input (URL values, callers): `display` is any string until normalised.
 * @typedef {Partial<Omit<RegionComparisonSelection, 'display'>> & {display?: string}} RegionComparisonInput */
/** @param {RegionComparisonInput | null | undefined} value @returns {RegionComparisonSelection} */
export function normaliseRegionComparison(value = undefined) {
	const regions = Array.isArray(value?.regions)
		? COMPARISON_REGIONS.filter((r) => value.regions?.includes(r.value)).map((r) => r.value)
		: [...DEFAULT_COMPARISON_REGIONS];
	const start = Number(value?.start),
		end = Number(value?.end);
	const validWindow =
		Number.isFinite(start) && Number.isFinite(end) && start >= EARLIEST_DATA_MS && end > start;
	return {
		interval: COMPARISON_INTERVALS.some((i) => i.value === value?.interval)
			? String(value?.interval)
			: '12mr',
		regions,
		charts: Array.isArray(value?.charts)
			? COMPARISON_CHART_OPTIONS.flatMap(({ id }) => {
					const selected = value.charts?.find((entry) => comparisonChartId(entry) === id);
					return selected ? [selected] : [];
				})
			: [...DEFAULT_COMPARISON_CHARTS],
		display: value?.display === 'stripes' ? 'stripes' : 'charts',
		mode: value?.mode === 'generation' ? 'generation' : 'share',
		basis: value?.basis === 'generation' ? 'generation' : 'demand',
		start: validWindow ? start : null,
		end: validWindow ? end : null,
		table: typeof value?.table === 'boolean' ? value.table : null
	};
}

/** @param {URLSearchParams} params */
export function parseRegionComparison(params) {
	return normaliseRegionComparison({
		charts: params.has('compare-charts')
			? (params.get('compare-charts') ?? '').split(',')
			: undefined,
		display: params.get('compare-display') ?? undefined,
		interval: params.get('compare-interval') ?? undefined,
		regions: params.has('compare-regions')
			? (params.get('compare-regions') ?? '').split(',')
			: undefined,
		mode: params.get('compare-renewables') === 'generation' ? 'generation' : 'share',
		basis: params.get('compare-basis') === 'generation' ? 'generation' : 'demand',
		start: Number(params.get('compare-start')),
		end: Number(params.get('compare-end')),
		table: params.has('compare-table') ? params.get('compare-table') !== '0' : null
	});
}
/** @param {URLSearchParams} params @param {RegionComparisonInput | undefined} selection */
export function applyRegionComparison(params, selection) {
	const state = normaliseRegionComparison(selection);
	const values = {
		'compare-charts':
			state.charts.join(',') === DEFAULT_COMPARISON_CHARTS.join(',')
				? null
				: state.charts.join(','),
		'compare-display': state.display === 'charts' ? '' : state.display,
		'compare-interval': state.interval === '12mr' ? '' : state.interval,
		'compare-regions':
			state.regions.join(',') === DEFAULT_COMPARISON_REGIONS.join(',')
				? null
				: state.regions.join(','),
		'compare-renewables': state.mode === 'share' ? '' : state.mode,
		'compare-basis': state.basis === 'demand' ? '' : state.basis,
		'compare-start': state.start == null ? '' : String(state.start),
		'compare-end': state.end == null ? '' : String(state.end),
		'compare-table': state.table == null ? '' : state.table ? '1' : '0'
	};
	for (const [key, value] of Object.entries(values)) {
		if (value || (['compare-regions', 'compare-charts'].includes(key) && value === ''))
			params.set(key, value);
		else params.delete(key);
	}
}

/** Synthetic UTC timestamps represent calendar periods, not simultaneous instants. */
export const COMPONENTS = [
	'emissions',
	'energy_mwh',
	'generation_mwh',
	'renewables',
	'demand_gross',
	'net_imports',
	'market_value',
	'market_value_real',
	...FUEL_COMPONENTS.flatMap((fuel) => [`${fuel}_energy`, `${fuel}_market_value`])
];
/** @param {number} time @param {number} [offset] */
export function monthStart(time, offset = 0) {
	const date = new Date(time);
	return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1);
}
/** @param {number} time @param {number} [offset] */
export function dayStart(time, offset = 0) {
	const date = new Date(time);
	return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + offset);
}
/** The start of the period after the one beginning at `time`.
 * @param {number} time @param {string} interval */
export function nextPeriodStart(time, interval) {
	if (interval === '1d') return dayStart(time, 1);
	return monthStart(time, interval === 'fy' || interval === '1y' ? 12 : 1);
}
/** @typedef {{start: number, end: number, dayEnd: number}} ComparisonBounds */
/** @param {number} now @returns {ComparisonBounds} */
export function comparisonBounds(now) {
	// The last complete calendar month and day in both networks (WEM is two
	// hours behind NEM, so the WEM-local clock is the earlier of the two).
	const local = now + 8 * 3_600_000;
	return { start: EARLIEST_DATA_MS, end: monthStart(local), dayEnd: dayStart(local) };
}
/** The complete-history window an interval may show: months, or days.
 * @param {ComparisonBounds} bounds @param {string} interval */
export function comparisonBoundsFor(bounds, interval) {
	return { start: bounds.start, end: interval === '1d' ? bounds.dayEnd : bounds.end };
}

/** The window an interval opens on, and the reset control returns to: the
 * latest year of days, the latest five years of months, or all history for
 * calendar and financial years.
 * @param {string} interval @param {{start: number, end: number}} bounds - The interval's bounds */
export function comparisonDefaultViewport(interval, bounds) {
	if (interval === '1d')
		return { start: Math.max(bounds.start, bounds.end - DAILY_WINDOW_MS), end: bounds.end };
	if (interval === '1M' || interval === '12mr')
		return {
			start: Math.max(bounds.start, monthStart(bounds.end, -DEFAULT_MONTHLY_SPAN_MONTHS)),
			end: bounds.end
		};
	return { start: bounds.start, end: bounds.end };
}
/** @param {string} interval */
export function comparisonDefaultLabel(interval) {
	if (interval === '1d') return 'Latest year';
	if (interval === '1M' || interval === '12mr') return 'Last 5 years';
	return 'All history';
}

/** Bound copied/custom viewports to complete history, including future URLs.
 * The daily interval is a fixed one-year window that only slides.
 * @param {number} start @param {number} end @param {{start:number,end:number}} bounds
 * @param {string} [interval] */
export function clampComparisonViewport(start, end, bounds, interval = '12mr') {
	const duration =
		interval === '1d'
			? Math.min(DAILY_WINDOW_MS, bounds.end - bounds.start)
			: Math.min(Math.max(end - start, COMPARISON_MIN_SPAN_MS), bounds.end - bounds.start);
	const right = Math.max(bounds.start + duration, Math.min(end, bounds.end));
	return { start: right - duration, end: right };
}

/** Reuse Tracker's intensity and source-generation classifications. Null source
 * readings invalidate their component for that month rather than becoming zero.
 * @param {any} response */
export function processComparisonEnergy(response) {
	const group = getGroup('detailed');
	const intensity = processEmissionsIntensity(response, {
		intervalHours: 1,
		networkTimezone: '+00:00',
		groupMap: group.fuelTechs
	});
	const energy = processNetworkData(response, {
		groupMap: group.fuelTechs,
		groupOrder: group.order,
		groupLabels: group.labels,
		loadsToInvert: loadGroupsFor(group),
		getColour: () => '#333333',
		metricFilter: 'energy',
		networkTimezone: '+00:00'
	});
	if (!intensity || !energy) return null;
	const sourceIds = contributionSeries(energy.seriesNames, loadGroupsFor(group), 'generation');
	const energyByTime = new Map(energy.data.map((row) => [row.time, row]));
	const invalid = new Map();
	for (const entry of response.data ?? []) {
		for (const series of entry.results ?? []) {
			const tech = series.columns?.fueltech ?? series.name;
			if (tech === 'battery' || !group.fuelTechs[tech]) continue;
			for (const [stamp, value] of series.data ?? []) {
				if (Number.isFinite(value)) continue;
				const time = calendarLabelMs(stamp);
				const keys = invalid.get(time) ?? new Set();
				keys.add(entry.metric === 'emissions' ? 'emissions' : 'energy_mwh');
				if (entry.metric === 'energy' && sourceIds.includes(tech)) keys.add('generation_mwh');
				invalid.set(time, keys);
			}
		}
	}
	const fuels = new Map(comparisonFuelRows(response, 'energy').map((row) => [row.time, row]));
	return {
		...intensity,
		seriesNames: [
			'emissions',
			'energy_mwh',
			'generation_mwh',
			...FUEL_COMPONENTS.map((fuel) => `${fuel}_energy`)
		],
		data: intensity.data.map((row) => {
			const source = energyByTime.get(row.time);
			const values = sourceIds.map((id) => source?.[id]).filter((value) => value != null);
			const next = {
				...row,
				...fuels.get(row.time),
				generation_mwh: values.length ? values.reduce((a, b) => a + b, 0) : null
			};
			for (const key of invalid.get(row.time) ?? []) next[key] = null;
			return next;
		})
	};
}

/** @param {any[]} energy @param {any[]} market */
export function joinComparisonComponents(energy, market) {
	const rows = new Map();
	for (const row of [...energy, ...market]) rows.set(row.time, { ...rows.get(row.time), ...row });
	return [...rows.values()].sort((a, b) => a.time - b.time);
}
/** Strict NEM + WEM calendar join: missing either component remains missing.
 * @param {any[]} nem @param {any[]} wem @returns {any[]} */
export function sumComparisonNetworks(nem, wem) {
	const west = new Map(wem.map((row) => [row.time, row]));
	return nem.map((row) => ({
		date: row.date,
		time: row.time,
		...Object.fromEntries(
			COMPONENTS.map((key) => [
				key,
				Number.isFinite(row[key]) && Number.isFinite(west.get(row.time)?.[key])
					? row[key] + west.get(row.time)[key]
					: null
			])
		)
	}));
}

/** Complete periods only, with complete annual and rolling windows.
 * @param {any[]} rows @param {string} interval @param {number} end */
export function aggregateComparison(rows, interval, end) {
	const monthly = rows.filter((row) => row.time < end);
	if (interval === '1M' || interval === '1d') return monthly;
	if (interval === '12mr') return rollingSum12MonthRows(monthly, COMPONENTS);
	const buckets = new Map();
	for (const row of monthly) {
		const date = new Date(row.time);
		const year = date.getUTCFullYear() - (interval === 'fy' && date.getUTCMonth() < 6 ? 1 : 0);
		const start = Date.UTC(year, interval === 'fy' ? 6 : 0, 1);
		const bucket = buckets.get(start) ?? new Map();
		bucket.set(row.time, row);
		buckets.set(start, bucket);
	}
	return [...buckets.entries()]
		.filter(([start]) => monthStart(start, 12) <= end)
		.map(([start, bucket]) => {
			const members = Array.from({ length: 12 }, (_, i) => bucket.get(monthStart(start, i)));
			return {
				date: new Date(start),
				time: start,
				...Object.fromEntries(
					COMPONENTS.map((key) => [
						key,
						members.every((row) => Number.isFinite(row?.[key]))
							? members.reduce((sum, row) => sum + row[key], 0)
							: null
					])
				)
			};
		});
}
/** Drawing-only empty periods stop Stratum joining lines across entirely absent
 * months/years. Exports continue to use the original observations.
 * @param {Record<string, any[]>} data @param {string[]} regions
 * @param {string} metric @param {'demand'|'generation'} basis
 * @param {string} interval @returns {any[]} */
export function comparisonChartRows(data, regions, metric, basis, interval) {
	const times = regions.flatMap((id) => (data[id] ?? []).map((row) => row.time));
	if (!times.length) return [];
	const first = Math.min(...times),
		last = Math.max(...times);
	const lookup = Object.fromEntries(
		regions.map((id) => [
			id,
			new Map((data[id] ?? []).map((row) => [row.time, comparisonMetricValue(row, metric, basis)]))
		])
	);
	const rows = [];
	for (let time = first; time <= last; time = nextPeriodStart(time, interval)) {
		rows.push({
			date: new Date(time),
			time,
			...Object.fromEntries(regions.map((id) => [id, lookup[id].get(time) ?? null]))
		});
	}
	return rows;
}
/** @type {Map<string, Intl.DateTimeFormat>} */
const formatters = new Map();
/** A cached en-AU UTC formatter: building one costs more than a pan frame
 * can afford across every axis label and readout.
 * @param {Intl.DateTimeFormatOptions} options */
export function utcFormatter(options) {
	const key = JSON.stringify(options);
	let formatter = formatters.get(key);
	if (!formatter) {
		formatter = new Intl.DateTimeFormat('en-AU', { ...options, timeZone: 'UTC' });
		formatters.set(key, formatter);
	}
	return formatter;
}
/** @type {Intl.DateTimeFormatOptions} */
const DAY_LABEL = { day: 'numeric', month: 'short', year: 'numeric' };
/** @type {Intl.DateTimeFormatOptions} */
const MONTH_LABEL = { month: 'short', year: 'numeric' };
/** @type {Intl.DateTimeFormatOptions} */
const MONTH_ONLY = { month: 'short' };
/** @type {Intl.DateTimeFormatOptions} */
const YEAR_ONLY = { year: 'numeric' };
/** @param {number} time @param {string} interval */
export function comparisonPeriod(time, interval) {
	const date = new Date(time),
		year = date.getUTCFullYear();
	if (interval === 'fy') return `${year}–${String(year + 1).slice(-2)} financial year`;
	if (interval === '1y') return String(year);
	if (interval === '1d') return utcFormatter(DAY_LABEL).format(date);
	const month = utcFormatter(MONTH_LABEL).format(date);
	return interval === '12mr' ? `12 months to ${month}` : month;
}
/** Regions that do not import or export outside their own network. */
export const CLOSED_NETWORKS = ['_all', 'wem'];

/** Buffer months fetched either side of a daily viewport. */
export const DAILY_FETCH_BUFFER_MONTHS = 3;
/** The daily rows a viewport needs: the window plus three whole months either
 * side, clipped to complete history. Month alignment means a slide inside the
 * buffer fetches nothing and crossing a month boundary fetches one month.
 * @param {{start: number, end: number}} viewport @param {{start: number, end: number}} bounds - Daily bounds */
export function dailyFetchWindow(viewport, bounds) {
	return {
		start: Math.max(bounds.start, monthStart(viewport.start, -DAILY_FETCH_BUFFER_MONTHS)),
		end: Math.min(bounds.end, monthStart(viewport.end - 1, DAILY_FETCH_BUFFER_MONTHS + 1))
	};
}

/** The provider sources each comparison region fetches, by name.
 * @typedef {{ energy: any[], market: any[], financial: any[], flows: any[] }} ComparisonSourceRows */

/**
 * Whether a comparison region's providers must fetch: the region itself is
 * selected, or the combined scope needs it as a component.
 * @param {string[]} regions - Selected comparison regions
 * @param {string} id
 */
export function comparisonSourceActive(regions, id) {
	return regions.includes(id) || (regions.includes('au') && CLOSED_NETWORKS.includes(id));
}

/**
 * Per-region loading/error state, with the combined scope rolled up from its
 * two networks.
 * @param {Record<string, { pending: boolean, error: string | null }>} sources
 * @returns {Record<string, { pending: boolean, error: string | null }>}
 */
export function comparisonStatus(sources) {
	return {
		...sources,
		au: {
			pending: !!(sources._all?.pending || sources.wem?.pending),
			error: sources._all?.error || sources.wem?.error || null
		}
	};
}

/**
 * Join each region's component rows into one monthly series, zero the net
 * imports of closed networks, and sum NEM + WEM into the combined scope.
 * @param {Record<string, ComparisonSourceRows>} sources
 * @returns {Record<string, any[]>}
 */
export function assembleComparisonMonthly(sources) {
	/** @type {Record<string, any[]>} */
	const monthly = {};
	for (const [id, rows] of Object.entries(sources)) {
		const core = joinComparisonComponents(rows.energy, rows.market);
		monthly[id] = joinComparisonComponents(
			joinComparisonComponents(core, rows.financial),
			rows.flows
		).map((row) => (CLOSED_NETWORKS.includes(id) ? { ...row, net_imports: 0 } : row));
	}
	monthly.au = sumComparisonNetworks(monthly._all ?? [], monthly.wem ?? []);
	return monthly;
}

/** Rows inside a half-open viewport, in time order.
 * @template {{ time: number }} Row
 * @param {Row[]} rows @param {{start: number, end: number}} viewport
 * @returns {Row[]} */
export function visibleComparisonRows(rows, viewport) {
	return rows.filter((row) => row.time >= viewport.start && row.time < viewport.end);
}

/** Tick steps, in months and in years, from finest to coarsest. */
const MONTH_STEPS = [1, 2, 3, 6, 12, 24, 60, 120, 240];
const YEAR_STEPS = [1, 2, 5, 10, 20];
const MAX_TICKS = 6;
/**
 * Tick dates anchored to the calendar, so a tick keeps its date as the
 * window slides and leaves the axis only when it leaves the viewport. Daily
 * windows tick at every month start; monthly rows tick at the finest month
 * step (1, 2, 3, 6, 12… months, counted from January) that keeps the count
 * within six; yearly rows likewise at a year step (1, 2, 5… years).
 * @param {Array<{date: Date, time: number}>} visibleRows @param {string} [interval] */
export function comparisonTicks(visibleRows, interval = '12mr') {
	const dates = visibleRows.map((row) => new Date(row.time));
	if (interval === '1d') return dates.filter((date) => date.getUTCDate() === 1);
	const yearly = interval === '1y' || interval === 'fy';
	const index = yearly
		? (/** @type {Date} */ date) => date.getUTCFullYear()
		: (/** @type {Date} */ date) => date.getUTCFullYear() * 12 + date.getUTCMonth();
	for (const step of yearly ? YEAR_STEPS : MONTH_STEPS) {
		const ticks = dates.filter((date) => index(date) % step === 0);
		if (ticks.length <= MAX_TICKS) return ticks;
	}
	return [];
}
/** Axis label for a comparison tick: years, with months below three years and
 * on daily windows (where January carries the year; every one-year window
 * contains a January, and the navigator names both years).
 * @param {number} time @param {string} interval @param {{start:number,end:number}} viewport */
export function comparisonTickLabel(time, interval, viewport) {
	const date = new Date(time);
	if (interval === '1d') {
		const withYear = date.getUTCMonth() === 0 && date.getUTCDate() === 1;
		return utcFormatter(withYear ? MONTH_LABEL : MONTH_ONLY).format(date);
	}
	const short = viewport.end - viewport.start < MONTH_TICKS_BELOW_MS;
	return utcFormatter(short ? MONTH_LABEL : YEAR_ONLY).format(date);
}

/** The latest visible period where every selected region has a finite value
 * for every displayed metric — the Regions table's resting inspection period.
 * @param {Record<string, any[]>} data @param {string[]} regions
 * @param {'demand' | 'generation'} basis @param {{start: number,end: number}} viewport
 * @param {string[]} metricIds - The displayed comparison metrics */
export function latestCommonComparisonPeriod(data, regions, basis, viewport, metricIds) {
	if (!regions.length || !metricIds.length) return null;
	const times = regions.map(
		(id) =>
			new Set(
				(data[id] ?? [])
					.filter(
						(row) =>
							row.time >= viewport.start &&
							row.time < viewport.end &&
							metricIds.every((metric) =>
								Number.isFinite(comparisonMetricValue(row, metric, basis))
							)
					)
					.map((row) => row.time)
			)
	);
	const common = [...times[0]].filter((time) => times.every((set) => set.has(time)));
	return common.length ? Math.max(...common) : null;
}

/** Scale regional comparison lines to the visible window, including the segments
 * crossing its edges. Missing readings never form interpolated segments.
 * @param {any[]} rows @param {string[]} regions @param {{start:number,end:number}} viewport
 * @param {'straight'|'smooth'|'step'} [curve]
 * @returns {[number,number]} */
export function comparisonYDomain(rows, regions, viewport, curve = 'straight') {
	let min = 0;
	let max = 0;
	const include = (/** @type {number} */ value) => {
		if (!Number.isFinite(value)) return;
		min = Math.min(min, value);
		max = Math.max(max, value);
	};
	const first = bisectTime(rows, viewport.start);
	const end = bisectTimeRight(rows, viewport.end);
	for (let i = first; i < end; i++) {
		for (const id of regions) include(rows[i][id]);
	}
	for (const time of [viewport.start, viewport.end]) {
		const i = bisectTime(rows, time);
		const left = rows[i - 1];
		const right = rows[i];
		if (!left || !right || right.time === time) continue;
		const fraction = (time - left.time) / (right.time - left.time);
		for (const id of regions) {
			if (Number.isFinite(left[id]) && Number.isFinite(right[id])) {
				if (curve === 'step') include(left[id]);
				else if (curve === 'smooth') {
					// Monotone curves stay inside their neighbouring endpoint values.
					include(left[id]);
					include(right[id]);
				} else include(left[id] + (right[id] - left[id]) * fraction);
			}
		}
	}
	return computeYDomain([{ _min: min, _max: max }]);
}
