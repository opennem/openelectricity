import {
	networkTimeZoneLabel,
	offsetMsFromOffset
} from '$lib/components/charts/v2/network-time.js';
import { quantileSorted } from 'd3-array';
import { DEMAND_GROSS_SERIES_ID } from '$lib/components/charts/network/market-series-ids.js';
import { averageProfileRows, profileRows } from './profile-chart.js';
import { buildFuelTechTableRows } from './table-model.js';

const DAY = 86_400_000;

/** The earliest last day a profile accepts — complete 5-minute days exist from here. */
export const PROFILE_MIN_DATE = '1999-01-01';

/** The Profile shows either the all-technology stack or the per-series breakdown. */
export const PROFILE_DISPLAY_OPTIONS = [
	{ value: 'stacked', label: 'Stacked' },
	{ value: 'breakdown', label: 'Breakdown' }
];

/** @param {unknown} value @returns {'stacked' | 'breakdown'} */
export function normaliseProfileDisplay(value) {
	return value === 'breakdown' ? 'breakdown' : 'stacked';
}

/** How the breakdown draws each series' days: the linear styles, then the radial. */
export const PROFILE_STYLE_OPTIONS = /** @type {const} */ ([
	{ value: 'lines', label: 'Multi-line' },
	{ value: 'bands', label: 'Percentile bands' },
	{ value: 'ridgeline', label: 'Ridgeline' },
	{ value: 'radial', label: 'Radial bars' },
	{ value: 'heatmap', label: 'Radial heatmap' }
]);

/** Multi-line unless a link asks for another style.
 * @param {unknown} value @returns {'lines' | 'bands' | 'radial' | 'ridgeline' | 'heatmap'} */
export function normaliseProfileStyle(value) {
	return value === 'bands' || value === 'radial' || value === 'ridgeline' || value === 'heatmap'
		? value
		: 'lines';
}

/** The percentile bands' hoverable parts — each band and the median line —
 * as the table's percentile columns: a band spans its two bounds. */
const BAND_COLUMNS = /** @type {Record<string, string[]>} */ ({
	low: ['p10', 'p25'],
	midLow: ['p25', 'p50'],
	midHigh: ['p50', 'p75'],
	high: ['p75', 'p90'],
	p50: ['p50']
});
/** A load reads as a magnitude in the table, so its bands flip end to end. */
const MIRRORED_BAND = /** @type {Record<string, string>} */ ({
	low: 'high',
	midLow: 'midHigh',
	midHigh: 'midLow',
	high: 'low',
	p50: 'p50'
});

/**
 * Converts between a breakdown chart's own hover key and the part the table
 * reads, in both directions: a load's percentile bands mirror (its 10–25% band
 * is the table's 75–90%), and every other key passes through. Percentile keys
 * without a table column (the transparent base, today) read as nothing.
 * @param {string} style @param {string | null | undefined} key @param {boolean} load
 * @returns {string | null}
 */
export function profileChartPart(style, key, load) {
	if (!key) return null;
	if (style !== 'bands') return key;
	if (!(key in MIRRORED_BAND)) return null;
	return load ? MIRRORED_BAND[key] : key;
}

/**
 * The table columns a hovered breakdown part focuses: a percentile band's two
 * bounds or the median, else the day (or Average) column it names.
 * @param {string} style @param {string | null} part @returns {string[]}
 */
export function profileFocusColumns(style, part) {
	if (!part) return [];
	return style === 'bands' ? (BAND_COLUMNS[part] ?? []) : [part];
}

/** Profile slot lengths: half-hours by default, or the native 5-minute readings. */
export const PROFILE_INTERVAL_OPTIONS = [
	{ value: '5m', label: '5 min' },
	{ value: '30m', label: '30 min' }
];

/** @param {unknown} value @returns {'5m' | '30m'} */
export function normaliseProfileInterval(value) {
	return value === '5m' ? '5m' : '30m';
}

export const PROFILE_DAY_OPTIONS = [7, 14, 28].map((days) => ({
	value: String(days),
	label: `${days} days`
}));

/** @param {unknown} value @returns {7 | 14 | 28} */
export function normaliseProfileDays(value) {
	return Number(value) === 14 ? 14 : Number(value) === 28 ? 28 : 7;
}

/** @param {unknown} value */
export function normaliseProfileEnd(value) {
	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
	const ms = Date.parse(`${value}T00:00:00Z`);
	return Number.isFinite(ms) &&
		new Date(ms).toISOString().slice(0, 10) === value &&
		value >= PROFILE_MIN_DATE
		? value
		: '';
}

/** Complete network-local days, half-open [start, end), split into `slots`
 * time-of-day slots of `slotMs`. Offsets deliberately ignore DST.
 * @param {number} nowMs @param {string} timeZone @param {number} days @param {string} [lastDate]
 * @param {'5m' | '30m'} [interval] */
export function profileWindow(nowMs, timeZone, days, lastDate = '', interval = '30m') {
	const offset = offsetMsFromOffset(timeZone);
	const today = Math.floor((nowMs + offset) / DAY) * DAY;
	const requested = normaliseProfileEnd(lastDate);
	const endLocal = requested ? Math.min(Date.parse(`${requested}T00:00:00Z`) + DAY, today) : today;
	const count = normaliseProfileDays(days);
	const end = endLocal - offset;
	return {
		start: end - count * DAY,
		end,
		offset,
		/** The current, incomplete network-local day, outside the window. */
		today: new Date(today).toISOString().slice(0, 10),
		todayStart: today - offset,
		slotMs: (interval === '5m' ? 5 : 30) * 60_000,
		slots: interval === '5m' ? 288 : 48,
		lastDate: new Date(endLocal - DAY).toISOString().slice(0, 10),
		maxDate: new Date(today - DAY).toISOString().slice(0, 10),
		dates: Array.from({ length: count }, (_, i) =>
			new Date(endLocal - (count - i) * DAY).toISOString().slice(0, 10)
		)
	};
}

/** The current, incomplete day as a one-day profile window, for the optional
 * multi-line "today" line: slots after the latest reading stay empty.
 * @param {ReturnType<typeof profileWindow>} window */
export function todayWindow(window) {
	return {
		...window,
		start: window.todayStart,
		end: window.todayStart + DAY,
		dates: [window.today]
	};
}

/** Equal-weight daily means per time-of-day slot; absent/non-finite samples never become zero.
 * Deduplicate native timestamps before bucketing so retries cannot alter weighting.
 * @param {Array<Record<string, any>>} rows @param {string} series
 * @param {ReturnType<typeof profileWindow>} window */
export function buildDailyProfile(rows, series, window) {
	const { slots, slotMs } = window;
	const buckets = window.dates.map(() =>
		Array.from({ length: slots }, () => ({ sum: 0, count: 0 }))
	);
	const unique = new Map(rows.map((row) => [row.time, row]));
	for (const [time, row] of unique) {
		if (!Number.isFinite(time) || time < window.start || time >= window.end) continue;
		const value = row[series];
		if (typeof value !== 'number' || !Number.isFinite(value)) continue;
		const day = Math.floor((time - window.start) / DAY);
		const slot = Math.floor(((time - window.start) % DAY) / slotMs);
		buckets[day][slot].sum += value;
		buckets[day][slot].count++;
	}
	return Array.from({ length: slots }, (_, slot) => {
		const values = buckets.map((day) => (day[slot].count ? day[slot].sum / day[slot].count : null));
		const available = values.filter((value) => value !== null);
		const minute = (slot * slotMs) / 60_000;
		return {
			minute,
			label: `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`,
			values,
			samples: buckets.map((day) => day[slot].count),
			days: available.length,
			average: available.length
				? available.reduce((sum, value) => sum + value, 0) / available.length
				: null
		};
	});
}

/** The 10th, 25th, 50th, 75th and 90th percentiles of a set of values, by
 * linear interpolation between sorted neighbours (d3 `quantileSorted`, as
 * Excel's `PERCENTILE.INC`); nulls are left out, and an empty set stays null.
 * @param {Array<number | null>} values */
function percentilesOf(values) {
	const sorted = /** @type {number[]} */ (values.filter((value) => value !== null)).sort(
		(a, b) => a - b
	);
	/** @param {number} p */
	const at = (p) => (sorted.length ? (quantileSorted(sorted, p) ?? null) : null);
	return { p10: at(0.1), p25: at(0.25), p50: at(0.5), p75: at(0.75), p90: at(0.9) };
}

/** Per slot, the percentiles of the days' values; a slot with no day stays
 * null throughout.
 * @param {ReturnType<typeof buildDailyProfile>} profile */
export function profilePercentiles(profile) {
	return profile.map(({ minute, label, values }) => ({ minute, label, ...percentilesOf(values) }));
}

/** Each day's average power: the mean of that day's available slots, or null
 * for a day with none.
 * @param {ReturnType<typeof buildDailyProfile>} profile */
export function dailyAverages(profile) {
	const days = profile[0]?.values.length ?? 0;
	return Array.from({ length: days }, (_, day) => {
		const values = /** @type {number[]} */ (
			profile.map((slot) => slot.values[day]).filter((value) => value !== null)
		);
		return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
	});
}

/** A series' percentile range for the fuel-tech table: across the days of the
 * slot starting at `minute`, or, without one, across each day's average power.
 * @param {ReturnType<typeof buildDailyProfile>} profile @param {number} [minute] */
export function profileRange(profile, minute) {
	return percentilesOf(
		minute === undefined
			? dailyAverages(profile)
			: (profile.find((slot) => slot.minute === minute)?.values ?? [])
	);
}

/** A network-local `YYYY-MM-DD` as a short label, e.g. "24 Sept".
 * @param {string} date */
export function formatProfileDay(date) {
	return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-AU', {
		day: 'numeric',
		month: 'short',
		timeZone: 'UTC'
	});
}

/** The profile's averages by hour of day: each hour averages its slots'
 * available averages, so a partial hour (today's latest) still reports.
 * @param {ReturnType<typeof buildDailyProfile>} profile */
export function hourlyProfile(profile) {
	return Array.from({ length: 24 }, (_, hour) => {
		const values = profile
			.filter((slot) => Math.floor(slot.minute / 60) === hour && slot.average !== null)
			.map((slot) => /** @type {number} */ (slot.average));
		return {
			hour,
			label: `${String(hour).padStart(2, '0')}:00`,
			average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
		};
	});
}

/** Stack independently averaged technology profiles cumulatively in group
 * order, with negative power pulling the stack down, as in the main chart.
 * A missing technology leaves a gap in that whole slot of the stack: its
 * contribution is unknown, not zero. Coverage remains available per technology.
 * @param {Array<Record<string, any>>} rows @param {string[]} names
 * @param {ReturnType<typeof profileWindow>} window */
export function buildAverageDayStack(rows, names, window) {
	const profiles = names.map((name) => buildDailyProfile(rows, name, window));
	const layers = names.map((name) => ({
		name,
		points:
			/** @type {Array<{minute: number, label: string, value: number | null, days: number, y0: number | null, y1: number | null}>} */ ([])
	}));
	for (let slot = 0; slot < window.slots; slot++) {
		let cumulative = 0;
		const complete = profiles.every((profile) => profile[slot].average !== null);
		for (let i = 0; i < names.length; i++) {
			const { minute, label, average: value, days } = profiles[i][slot];
			let y0 = null;
			let y1 = null;
			if (complete && value !== null) {
				y0 = cumulative;
				y1 = y0 + value;
				cumulative = y1;
			}
			layers[i].points.push({ minute, label, value, days, y0, y1 });
		}
	}
	return layers;
}

/** The fuel-tech table for an average day: each technology's average power,
 * its energy over the average day (MWh) and its contribution, from its own
 * slot averages — a technology missing from some slots still reports the
 * slots it has. Contribution is a share of source generation, or of the
 * average day's gross demand (`demand`, a `buildDailyProfile` of
 * `demand_gross`); without demand that share is unavailable. With `range` (an
 * inspected chart slot, or a radial clock's hour), the values cover only the
 * slots starting inside it. Price and emissions stay unavailable.
 * @param {{
 *   layers: ReturnType<typeof buildAverageDayStack>,
 *   meta: {seriesNames: string[], seriesLabels: Record<string, string>, seriesColours: Record<string, string>, groupFuelTechs?: Record<string, string[]>},
 *   loadSeriesIds: string[],
 *   hidden: string[],
 *   mode: import('./types.js').ContributionMode,
 *   demand?: ReturnType<typeof buildDailyProfile> | null,
 *   slotMs: number,
 *   range?: {start: number, end: number}
 * }} input */
export function averageDayTableRows({
	layers,
	meta,
	loadSeriesIds,
	hidden,
	mode,
	demand,
	slotMs,
	range
}) {
	/** @param {Array<Record<string, any> & {time: number}>} rows */
	const at = (rows) =>
		range ? rows.filter((row) => row.time >= range.start && row.time < range.end) : rows;
	const demandRows = demand ? profileRows(demand, DEMAND_GROSS_SERIES_ID) : [];
	return buildFuelTechTableRows({
		generationData: { ...meta, data: at(averageProfileRows(layers)) },
		mvRows: [],
		emissionsRows: [],
		demandRows: at(demandRows),
		basis: 'power',
		demandBasis: 'power',
		bucketHours: () => slotMs / 3_600_000,
		mode,
		hiddenSeries: hidden,
		loadSeriesIds
	});
}

/** The selected profiles as an export dataset for the shared CSV serialiser:
 * a row per time-of-day slot with each series' average and the days behind it, plus
 * every day's value when `daily` (the Breakdown).
 * @param {{
 *   series: Array<{label: string, unit: string, profile: ReturnType<typeof buildDailyProfile>}>,
 *   dates: string[],
 *   daily: boolean,
 *   region: string,
 *   timeZone: string
 * }} context
 * @returns {import('./types.js').ExportDataset} */
export function profileDataset({ series, dates, daily, region, timeZone }) {
	return {
		key: 'profile',
		title: 'Profile',
		columns: [
			{ key: 'region', header: 'Region', type: 'string' },
			{ key: 'timeZone', header: 'Network time', type: 'string' },
			{ key: 'label', header: 'Time of day', type: 'string' },
			...series.flatMap(({ label, unit }, s) => [
				{
					key: `${s}:average`,
					header: `${label} average (${unit})`,
					type: /** @type {const} */ ('number')
				},
				{ key: `${s}:days`, header: `${label} days`, type: /** @type {const} */ ('number') },
				...(daily
					? dates.map((date, d) => ({
							key: `${s}:${d}`,
							header: `${label} ${date} (${unit})`,
							type: /** @type {const} */ ('number')
						}))
					: [])
			])
		],
		rows: (series[0]?.profile ?? []).map((slot, i) => ({
			region,
			timeZone: networkTimeZoneLabel(timeZone),
			label: slot.label,
			...Object.fromEntries(
				series.flatMap(({ profile }, s) => [
					[`${s}:average`, profile[i].average],
					[`${s}:days`, profile[i].days],
					...(daily ? dates.map((_, d) => [`${s}:${d}`, profile[i].values[d]]) : [])
				])
			)
		}))
	};
}
