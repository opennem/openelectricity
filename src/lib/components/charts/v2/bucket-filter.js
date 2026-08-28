/**
 * Recurring calendar-period filters for the tracker's All range.
 *
 * Charts keep only matching display points, while summary calculations retain
 * the native row cadence and remove non-matching values. The latter matters to
 * calculations that infer interval length from adjacent timestamps.
 */

import { baseIntervalFor } from '$lib/components/charts/facility/range-interval-config.js';
import { localYearMonth } from './date-labels.js';
import { offsetHoursFromIana } from './network-time.js';

const MONTH_IDS = /** @type {const} */ ([
	'jan',
	'feb',
	'mar',
	'apr',
	'may',
	'jun',
	'jul',
	'aug',
	'sep',
	'oct',
	'nov',
	'dec'
]);

const SEASON_OF_MONTH0 = [
	'summer',
	'summer',
	'autumn',
	'autumn',
	'autumn',
	'winter',
	'winter',
	'winter',
	'spring',
	'spring',
	'spring',
	'summer'
];

/** @type {Record<string, Array<{ id: string, label: string }>>} */
export const BUCKET_FILTER_OPTIONS = {
	'1M': MONTH_IDS.map((id) => ({
		id,
		label: id.charAt(0).toUpperCase() + id.slice(1)
	})),
	season: [
		{ id: 'summer', label: 'Summer' },
		{ id: 'autumn', label: 'Autumn' },
		{ id: 'winter', label: 'Winter' },
		{ id: 'spring', label: 'Spring' }
	],
	quarter: [
		{ id: 'q1', label: 'Q1' },
		{ id: 'q2', label: 'Q2' },
		{ id: 'q3', label: 'Q3' },
		{ id: 'q4', label: 'Q4' }
	],
	half: [
		{ id: 'h1', label: 'H1' },
		{ id: 'h2', label: 'H2' }
	]
};

/**
 * The filterable base grain of a display interval — rolling variants filter on
 * the grain their windows are sampled at. Null for unfilterable grains
 * (financial year, calendar year and sub-monthly).
 *
 * @param {string} displayInterval
 * @returns {string | null}
 */
export function bucketFilterKindFor(displayInterval) {
	const base = baseIntervalFor(displayInterval) ?? displayInterval;
	return Object.hasOwn(BUCKET_FILTER_OPTIONS, base) ? base : null;
}

/**
 * @param {string | null} kind
 * @returns {Array<{ id: string, label: string }> | null}
 */
export function bucketFilterOptionsFor(kind) {
	return kind ? (BUCKET_FILTER_OPTIONS[kind] ?? null) : null;
}

/**
 * @param {string | null} kind
 * @param {string | null | undefined} id
 * @returns {boolean}
 */
export function isValidBucketFilter(kind, id) {
	return !!id && !!bucketFilterOptionsFor(kind)?.some((option) => option.id === id);
}

/**
 * Row-time predicate for a filter id, or null when unfiltered/invalid.
 *
 * @param {string | null} kind
 * @param {string | null | undefined} filterId
 * @param {string} ianaTimeZone
 * @returns {((timeMs: number) => boolean) | null}
 */
export function bucketFilterPredicate(kind, filterId, ianaTimeZone) {
	if (!isValidBucketFilter(kind, filterId)) return null;
	return (timeMs) => {
		const { month0 } = localYearMonth(new Date(timeMs), ianaTimeZone);
		switch (kind) {
			case '1M':
				return MONTH_IDS[month0] === filterId;
			case 'season':
				return SEASON_OF_MONTH0[month0] === filterId;
			case 'quarter':
				return `q${Math.floor(month0 / 3) + 1}` === filterId;
			case 'half':
				return (month0 < 6 ? 'h1' : 'h2') === filterId;
			default:
				return true;
		}
	};
}

/**
 * Remove series values outside the selected period while retaining row times.
 *
 * @param {any[]} rows
 * @param {((timeMs: number) => boolean) | null} predicate
 * @returns {any[]}
 */
export function applyBucketFilter(rows, predicate) {
	if (!predicate) return rows;
	return rows.map((row) => (predicate(row.time) ? row : { date: row.date, time: row.time }));
}

/**
 * Keep matching display rows and close the last stepped band one year later.
 * The closing row must not be used in summary calculations because it repeats
 * the final value.
 *
 * @param {any[]} rows
 * @param {((timeMs: number) => boolean) | null} predicate
 * @param {string} ianaTimeZone
 * @returns {any[]}
 */
export function applyBucketFilterToDisplayRows(rows, predicate, ianaTimeZone) {
	if (!predicate) return rows;
	const kept = rows.filter((row) => predicate(row.time));
	const last = kept[kept.length - 1];
	if (last) {
		const { year, month0 } = localYearMonth(new Date(last.time), ianaTimeZone);
		const offsetMs = offsetHoursFromIana(ianaTimeZone) * 60 * 60 * 1000;
		const closeTime = Date.UTC(year + 1, month0, 1) - offsetMs - 1;
		kept.push({
			...last,
			_bandClose: true,
			date: new Date(closeTime),
			time: closeTime
		});
	}
	return kept;
}
