/**
 * Growth: each bucket's change from the bucket it is compared with, per
 * series. A stacked growth chart shows which technologies grew or shrank
 * (positives above zero, negatives below), and its net is the total's change.
 *
 * Plain grains compare with the previous bucket (month-on-month). A 12-month
 * rolling grain compares with the window a year earlier, since consecutive
 * windows share 11 months; so does a calendar-period filter, whose rows are
 * already a year apart.
 */

/** Rolling display grains → rows per year (each row is one sampled window). */
const ROLLING_ROWS_PER_YEAR = /** @type {Record<string, number>} */ ({
	'12mr': 12,
	'12mr-season': 4,
	'12mr-quarter': 4,
	'12mr-half': 2
});

/** Plain display grains → the period word in "month-on-month". */
const PERIOD_NAMES = /** @type {Record<string, string>} */ ({
	'1h': 'hour',
	'1d': 'day',
	'7d': 'week',
	'1M': 'month',
	season: 'season',
	quarter: 'quarter',
	half: 'half-year',
	fy: 'year',
	'1y': 'year'
});

const DAY_MS = 24 * 60 * 60 * 1000;

/** A display row; `_bandClose` marks a filtered band's drawing-only closing row.
 * @typedef {{ time: number, date: Date, _bandClose?: boolean, [key: string]: any }} GrowthRow */

/** Longest bucket of each plain grain, for the lead-in window. */
const MAX_BUCKET_MS = /** @type {Record<string, number>} */ ({
	'1h': 60 * 60 * 1000,
	'1d': DAY_MS,
	'7d': 7 * DAY_MS,
	'1M': 31 * DAY_MS,
	season: 92 * DAY_MS,
	quarter: 92 * DAY_MS,
	half: 184 * DAY_MS,
	fy: 366 * DAY_MS,
	'1y': 366 * DAY_MS
});

/**
 * @typedef {Object} GrowthComparison
 * @property {number} lag - Rows back to the compared bucket
 * @property {string} label - e.g. 'month-on-month', 'year-on-year'
 * @property {number} leadInMs - How far before the view the compared rows can lie
 */

/**
 * How a display grain's growth is measured, or null where growth isn't
 * offered (sub-hourly power grains).
 * @param {string} displayInterval
 * @param {{ filtered?: boolean }} [options] - `filtered`: a calendar-period filter is on
 * @returns {GrowthComparison | null}
 */
export function growthComparison(displayInterval, { filtered = false } = {}) {
	const rollingRows = ROLLING_ROWS_PER_YEAR[displayInterval];
	const period = PERIOD_NAMES[displayInterval];
	if (!rollingRows && !period) return null;
	if (filtered || rollingRows) {
		return {
			lag: filtered ? 1 : rollingRows,
			label: 'year-on-year',
			leadInMs: 2 * 366 * DAY_MS
		};
	}
	return { lag: 1, label: `${period}-on-${period}`, leadInMs: 2 * MAX_BUCKET_MS[displayInterval] };
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function finite(value) {
	if (value === null || value === undefined) return null;
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
}

/**
 * Growth rows for `rows`, compared `lag` rows back. `leadIn` holds the rows
 * just before `rows`, so the first visible buckets have something to compare
 * with; without it they are gaps, as is any bucket whose value or compared
 * value is missing. A drawing-only closing row (`_bandClose`, which repeats
 * the last bucket to close a filtered band) repeats the last growth row.
 *
 * @param {GrowthRow[]} rows
 * @param {string[]} domains
 * @param {number} lag
 * @param {GrowthRow[]} [leadIn]
 * @returns {GrowthRow[]}
 */
export default function growth(rows, domains, lag, leadIn = []) {
	const observations = leadIn.filter((row) => !row._bandClose);
	/** @type {GrowthRow[]} */
	const result = [];
	for (const row of rows) {
		if (row._bandClose) {
			const previous = result[result.length - 1];
			result.push(
				previous ? { ...previous, _bandClose: true, date: row.date, time: row.time } : row
			);
			continue;
		}
		const compared = observations[observations.length - lag];
		/** @type {GrowthRow} */
		const next = { ...row };
		for (const domain of domains) {
			const value = finite(row[domain]);
			const base = compared ? finite(compared[domain]) : null;
			next[domain] = value === null || base === null ? null : value - base;
		}
		result.push(next);
		observations.push(row);
	}
	return result;
}
