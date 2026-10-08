import { bisectTime, bisectTimeRight } from '$lib/components/charts/v2/binary-search.js';
import { computeYDomain } from '$lib/components/charts/v2/compute-y-domain.js';
import {
	COMPARISON_CHART_OPTIONS,
	DEFAULT_COMPARISON_CHARTS,
	calendarLabelMs,
	comparisonChartFromSlug,
	comparisonChartId,
	comparisonChartSlug,
	FUEL_COMPONENTS,
	comparisonFuelRows,
	comparisonMetricValue,
	normaliseComparisonResponse
} from './comparison-metrics.js';
import { allRegionsOption, regionOptions } from '$lib/regions.js';
import { withTrackerLabel } from './tracker-regions.js';
import { EARLIEST_DATA_MS } from '$lib/utils/date-range.js';
import { getGroup, loadGroupsFor } from '$lib/components/charts/network/groups.js';
import { contributionSeries } from '$lib/components/charts/network/contribution.js';
import { processEmissionsIntensity } from '$lib/components/charts/network/process-emissions-intensity.js';
import { processNetworkData } from '$lib/components/charts/network/process-network-data.js';
import {
	completeBucketRows,
	displayFullTransform
} from '$lib/components/charts/v2/dataProcessing.js';
import { BUCKET_MONTHS } from '$lib/components/charts/v2/bucket-boundaries.js';
import {
	bucketFilterKindFor,
	bucketFilterOptionsFor,
	bucketFilterPredicate,
	isValidBucketFilter
} from '$lib/components/charts/v2/bucket-filter.js';
import {
	formatRangeLabel,
	getTimeFormatPolicy
} from '$lib/components/charts/v2/time-format-policy.js';
import {
	baseIntervalFor,
	getIntervalsForRange
} from '$lib/components/charts/facility/range-interval-config.js';

export const COMPARISON_REGIONS = [
	...regionOptions.filter((region) => region.value !== '_all').map(withTrackerLabel),
	withTrackerLabel(regionOptions[0]),
	{ ...allRegionsOption, label: 'All Regions (NEM + WEM)', shortLabel: 'All Regions' }
];
/** The shortest comparison window — one full year of periods. */
export const COMPARISON_MIN_SPAN_MS = 366 * 86_400_000;
/** Below three years the axis shows months as well as years. */
export const MONTH_TICKS_BELOW_MS = 3 * 365 * 86_400_000;
export const DEFAULT_COMPARISON_REGIONS = COMPARISON_REGIONS.slice(0, 6).map((r) => r.value);
/** A region's URL name: its value without the market's trailing `1`, and
 * `nem` for the NEM-wide scope (`nsw`, `wem`, `nem`, `au`).
 * @param {string} value */
export function comparisonRegionSlug(value) {
	return value === '_all' ? 'nem' : value.replace(/1$/, '');
}
const REGIONS_BY_SLUG = new Map(
	COMPARISON_REGIONS.map(({ value }) => [comparisonRegionSlug(value), value])
);
/** The region a URL name stands for; values themselves (older links) pass
 * through, and anything else is left for normalisation to drop.
 * @param {string} slug */
export function comparisonRegionFromSlug(slug) {
	return REGIONS_BY_SLUG.get(slug) ?? slug;
}
/** Compare's intervals: Timeline's All range, Month to Year, each grain with
 * its 12-month rolling variant where it has one. */
export const COMPARISON_INTERVAL_IDS = getIntervalsForRange('ALL', {
	includeRolling: true
}).options;
/** The calendar-period filter's label ("Jan", "Summer", "Q1"…), or null when unfiltered.
 * @param {string} interval @param {string | null} filter */
export function comparisonFilterLabel(interval, filter) {
	return (
		bucketFilterOptionsFor(bucketFilterKindFor(interval))?.find((option) => option.id === filter)
			?.label ?? null
	);
}

/** @typedef {'charts' | 'panels' | 'ranks' | 'stripes'} ComparisonDisplay */
/**
 * The top-nav display switch, in switch order. Each display draws every
 * selected chart in its own way; the orchestrator reads these flags rather
 * than naming displays. `slug` is the `compare-display` URL value (empty for
 * the default); `resizable` cards keep a drag-to-resize height, and `panZoom`
 * cards take Trends' tap-to-engage pan and zoom.
 * @typedef {{value: ComparisonDisplay, slug: string, label: string, resizable: boolean, panZoom: boolean}} ComparisonDisplayDescriptor
 * @type {ComparisonDisplayDescriptor[]}
 */
export const COMPARISON_DISPLAYS = [
	// Each region as a line over time.
	{ value: 'charts', slug: '', label: 'Trends', resizable: true, panZoom: true },
	// Small multiples: one panel per region on a shared scale, the other
	// regions as grey ghost lines behind it.
	{ value: 'panels', slug: 'panels', label: 'Panels', resizable: false, panZoom: false },
	// Each region's rank among the selected regions, 1 for the highest.
	{ value: 'ranks', slug: 'ranks', label: 'Ranks', resizable: true, panZoom: true },
	// A row of colour cells per region.
	{ value: 'stripes', slug: 'heatmap', label: 'Heatmap', resizable: false, panZoom: false }
];
/** A display's descriptor; Trends for anything unknown.
 * @param {string | null | undefined} value @returns {ComparisonDisplayDescriptor} */
export function comparisonDisplay(value) {
	return COMPARISON_DISPLAYS.find((display) => display.value === value) ?? COMPARISON_DISPLAYS[0];
}
/** @param {string | null | undefined} value @returns {ComparisonDisplay} */
export function normaliseComparisonDisplay(value) {
	return comparisonDisplay(value).value;
}
/** The display a `compare-display` value names: its slug, or the display's
 * own id (`stripes`, the heatmap's earlier name); undefined when unknown.
 * @param {string | null} slug @returns {ComparisonDisplay | undefined} */
export function comparisonDisplayFromSlug(slug) {
	return COMPARISON_DISPLAYS.find(
		(display) => slug && (display.slug === slug || display.value === slug)
	)?.value;
}
/** `filter` keeps one calendar period of the interval's grain each year — a
 * month, season, quarter or half (Timeline's calendar-period filter ids).
 * @typedef {{charts: string[], display: ComparisonDisplay, interval: string, filter: string | null, regions: string[], basis: 'demand' | 'generation', start: number | null, end: number | null, table: boolean | null}} RegionComparisonSelection */
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
	const interval = COMPARISON_INTERVAL_IDS.includes(String(value?.interval))
		? String(value?.interval)
		: '12mr';
	return {
		interval,
		filter: isValidBucketFilter(bucketFilterKindFor(interval), value?.filter)
			? String(value?.filter)
			: null,
		regions,
		charts: Array.isArray(value?.charts)
			? COMPARISON_CHART_OPTIONS.flatMap(({ id }) => {
					const selected = value.charts
						?.map(comparisonChartFromSlug)
						.find((entry) => comparisonChartId(entry) === id);
					return selected ? [selected] : [];
				})
			: [...DEFAULT_COMPARISON_CHARTS],
		display: normaliseComparisonDisplay(value?.display),
		basis: value?.basis === 'generation' ? 'generation' : 'demand',
		start: validWindow ? start : null,
		end: validWindow ? end : null,
		table: typeof value?.table === 'boolean' ? value.table : null
	};
}

/** @param {URLSearchParams} params */
export function parseRegionComparison(params) {
	/** @param {string} key @param {(slug: string) => string} fromSlug */
	const list = (key, fromSlug) =>
		params.has(key) ? (params.get(key) ?? '').split(',').map(fromSlug) : undefined;
	return normaliseRegionComparison({
		charts: list('compare-charts', comparisonChartFromSlug),
		display: comparisonDisplayFromSlug(params.get('compare-display')),
		interval: params.get('compare-interval') ?? undefined,
		filter: params.get('compare-filter'),
		regions: list('compare-regions', comparisonRegionFromSlug),
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
				: state.charts.map(comparisonChartSlug).join(','),
		'compare-display': comparisonDisplay(state.display).slug,
		'compare-interval': state.interval === '12mr' ? '' : state.interval,
		'compare-filter': state.filter ?? '',
		'compare-regions':
			state.regions.join(',') === DEFAULT_COMPARISON_REGIONS.join(',')
				? null
				: state.regions.map(comparisonRegionSlug).join(','),
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
/** Months from one row to the next: the grain's period (a rolling interval
 * samples its window once per period of its grain), or a whole year while a
 * calendar-period filter keeps one row per year.
 * @param {string} interval - A monthly-based interval @param {string | null} [filter] */
export function periodMonths(interval, filter = null) {
	if (filter) return 12;
	const grain = /** @type {keyof typeof BUCKET_MONTHS} */ (baseIntervalFor(interval) ?? interval);
	return BUCKET_MONTHS[grain] ?? 1;
}
/** The start of the row after the one beginning at `time`, `months` on
 * (`periodMonths`).
 * @param {number} time @param {number} months */
export function nextPeriodStart(time, months) {
	return monthStart(time, months);
}
/** Complete history: from the data floor to the last complete calendar month
 * in both networks (WEM is two hours behind NEM, so the WEM-local clock is the
 * earlier of the two).
 * @param {number} now @returns {{start: number, end: number}} */
export function comparisonBounds(now) {
	return { start: EARLIEST_DATA_MS, end: monthStart(now + 8 * 3_600_000) };
}

/** Bound copied/custom viewports to complete history, including future URLs,
 * and to at least a year of periods.
 * @param {number} start @param {number} end @param {{start:number,end:number}} bounds */
export function clampComparisonViewport(start, end, bounds) {
	const duration = Math.min(
		Math.max(end - start, COMPARISON_MIN_SPAN_MS),
		bounds.end - bounds.start
	);
	const right = Math.max(bounds.start + duration, Math.min(end, bounds.end));
	return { start: right - duration, end: right };
}

/** Reuse Tracker's intensity and source-generation classifications. Missing
 * source readings (`normaliseComparisonResponse`) invalidate their component
 * for that month rather than becoming zero.
 * @param {any} raw */
export function processComparisonEnergy(raw) {
	const response = normaliseComparisonResponse(raw);
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

/** Complete periods only, with complete calendar buckets and rolling
 * windows, kept to one calendar period a year when `filter` names one. Rows
 * are dated by their period's start; a rolling row by the start of the last
 * period its 12-month window covers.
 * @param {any[]} rows @param {string} interval @param {number} end
 * @param {string | null} [filter] */
export function aggregateComparison(rows, interval, end, filter = null) {
	const periods = comparisonPeriods(
		rows.filter((row) => row.time < end),
		interval
	);
	const keep = bucketFilterPredicate(bucketFilterKindFor(interval), filter, 'UTC');
	return keep ? periods.filter((row) => keep(row.time)) : periods;
}
/** Timeline's calendar buckets and rolling windows, on the UTC
 * calendar-label axis.
 * @param {any[]} monthly - Complete months @param {string} interval */
function comparisonPeriods(monthly, interval) {
	if (interval === '1M') return monthly;
	const rolling = displayFullTransform({
		apiInterval: '1M',
		displayInterval: interval,
		ianaTimeZone: 'UTC'
	});
	if (rolling) return rolling(monthly, COMPONENTS);
	return completeBucketRows(
		monthly,
		COMPONENTS,
		/** @type {keyof typeof BUCKET_MONTHS} */ (interval),
		'UTC'
	);
}
/** Drawing-only empty periods stop Stratum joining lines across entirely absent
 * periods. Exports continue to use the original observations.
 * @param {Record<string, any[]>} data @param {string[]} regions
 * @param {string} metric @param {'demand'|'generation'} basis
 * @param {number} months - Months between rows (`periodMonths`) @returns {any[]} */
export function comparisonChartRows(data, regions, metric, basis, months) {
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
	for (let time = first; time <= last; time = nextPeriodStart(time, months)) {
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
const MONTH_LABEL = { month: 'short', year: 'numeric' };
/** @type {Intl.DateTimeFormatOptions} */
const YEAR_ONLY = { year: 'numeric' };
/** A period's label, as Timeline's tooltips name it: `Aug 2026`,
 * `Summer 2025/26`, `Q1 2026`, `FY2026`, `2025`, `12 months to Winter 2026`.
 * @param {number} time @param {string} interval */
export function comparisonPeriod(time, interval) {
	return getTimeFormatPolicy(interval, 'UTC').formatTooltip(time);
}
/** The top-nav readout of the periods on screen, from the first to the last,
 * as Timeline's range readout writes it (`Jan 1999 — Aug 2026`,
 * `FY2000 — FY2026`); empty when nothing is shown.
 * @param {number | null} first @param {number | null} last @param {string} interval */
export function comparisonRangeLabel(first, last, interval) {
	if (first == null || last == null || last < first) return '';
	return formatRangeLabel(first, last, interval, 'UTC');
}
/** Regions that do not import or export outside their own network. */
export const CLOSED_NETWORKS = ['_all', 'wem'];

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
 * window slides and leaves the axis only when it leaves the viewport. Monthly
 * rows tick at the finest month
 * step (1, 2, 3, 6, 12… months, counted from January) that keeps the count
 * within six; coarser rows (seasons to years, or one filtered period a
 * year) at each year's first row, a year step (1, 2, 5… years) apart.
 * @param {Array<{date: Date, time: number}>} visibleRows
 * @param {number} [months] - Months between rows (`periodMonths`)
 * @param {number} [maxTicks] - The most ticks to keep, six unless a narrow chart asks for fewer */
export function comparisonTicks(visibleRows, months = 1, maxTicks = MAX_TICKS) {
	const dates = visibleRows.map((row) => new Date(row.time));
	if (months === 1) {
		/** @param {Date} date */
		const index = (date) => date.getUTCFullYear() * 12 + date.getUTCMonth();
		for (const step of MONTH_STEPS) {
			const ticks = dates.filter((date) => index(date) % step === 0);
			if (ticks.length <= maxTicks) return ticks;
		}
		return [];
	}
	// Coarser rows tick at each year's first row, a year step apart.
	const firsts = dates.filter(
		(date, i) => i === 0 || date.getUTCFullYear() !== dates[i - 1].getUTCFullYear()
	);
	for (const step of YEAR_STEPS) {
		const ticks = firsts.filter((date) => date.getUTCFullYear() % step === 0);
		if (ticks.length <= maxTicks) return ticks;
	}
	return [];
}
/** Axis label for a comparison tick: years, with months below three years.
 * @param {number} time @param {{start:number,end:number}} viewport */
export function comparisonTickLabel(time, viewport) {
	const short = viewport.end - viewport.start < MONTH_TICKS_BELOW_MS;
	return utcFormatter(short ? MONTH_LABEL : YEAR_ONLY).format(time);
}

/** How far back from the latest visible period a region's metric must still
 * report to hold the table to a common period: a year, or two periods at
 * coarser grains. */
const CURRENT_SPAN_MONTHS = 12;

/** The Regions table's resting inspection period: the latest visible period
 * where every selected region's current metrics all have a value, so a feed
 * that lags by a period or two (real prices await CPI) holds the table back
 * to a complete row. Only what can report counts: a region without data in
 * view (loading or failed) is left out, and so is a region's metric with no
 * value in the latest year of the view — one it never had (Tasmania's coal)
 * or that ended long ago (South Australia's) — which reads "—" instead of
 * pinning every region to its last value.
 * @param {Record<string, any[]>} data @param {string[]} regions
 * @param {'demand' | 'generation'} basis @param {{start: number,end: number}} viewport
 * @param {string[]} metricIds - The displayed comparison metrics
 * @param {number} [months] - Months per period (`periodMonths`) */
export function latestCommonComparisonPeriod(
	data,
	regions,
	basis,
	viewport,
	metricIds,
	months = 1
) {
	if (!metricIds.length) return null;
	/** @param {any} row @param {string} metric */
	const has = (row, metric) => Number.isFinite(comparisonMetricValue(row, metric, basis));
	const visible = regions
		.map((id) =>
			(data[id] ?? []).filter(
				(row) =>
					row.time >= viewport.start &&
					row.time < viewport.end &&
					metricIds.some((metric) => has(row, metric))
			)
		)
		.filter((rows) => rows.length);
	if (!visible.length) return null;
	const latest = visible.reduce(
		(max, rows) => rows.reduce((at, row) => Math.max(at, row.time), max),
		-Infinity
	);
	const currentFrom = monthStart(latest, 1 - Math.max(CURRENT_SPAN_MONTHS, 2 * months));
	const times = visible.map((rows) => {
		const current = metricIds.filter((metric) =>
			rows.some((row) => row.time >= currentFrom && has(row, metric))
		);
		return new Set(
			rows.filter((row) => current.every((metric) => has(row, metric))).map((row) => row.time)
		);
	});
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
