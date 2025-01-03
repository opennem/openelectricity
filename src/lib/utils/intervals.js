import {
	addMinutes,
	addMonths,
	addYears,
	startOfMinute,
	startOfMonth,
	startOfYear
} from 'date-fns';

/**
 * TODO: add jsdoc
 * Parse interval:
 * - years = Y
 * - quarters = Q
 * - months = M
 * - weeks = w
 * - days = d
 * - hours = h
 * - minutes = m
 * - seconds = s
 */
export const YEAR = 'Y';
export const YEAR_HALF = '6M';
export const QUARTER = 'Q';
export const MONTH = 'M';
export const MINUTE = 'm';
// const durationKeys = ['s', 'm', 'h', 'd', 'w', 'M', 'Q', 'Y'];
const durationKeys = [MINUTE, MONTH, QUARTER, YEAR_HALF, YEAR];

/** @type {Object.<string, string>} */
export const INTERVAL_LABELS = {};
INTERVAL_LABELS[YEAR] = 'Year';
INTERVAL_LABELS[YEAR_HALF] = 'Half Year';
INTERVAL_LABELS[QUARTER] = 'Quarter';
INTERVAL_LABELS[MONTH] = 'Month';
INTERVAL_LABELS[MINUTE] = 'Minute';

/**
 *
 * @param {string} intervalString
 * @returns {StatsInterval}
 */
export default function (intervalString) {
	const length = intervalString.length;
	const key = intervalString.charAt(length - 1);
	const incrementerValue = length === 1 ? 1 : parseInt(intervalString.substring(0, length - 1), 10);
	let incrementerFn, startOfFn;
	let seconds = 0;

	if (durationKeys.includes(key)) {
		if (key === YEAR) {
			incrementerFn = /** @type {Function} */ (addYears);
			startOfFn = /** @type {Function} */ (startOfYear);
			seconds = incrementerValue * 365 * 24 * 60 * 60;
		} else if (key === YEAR_HALF) {
			incrementerFn = /** @type {Function} */ ((/** @type {*} */ d) => addMonths(d, 6));
			startOfFn = /** @type {Function} */ (startOfMonth);
			seconds = 6 * 30 * 24 * 60 * 60;
		} else if (key === QUARTER) {
			incrementerFn = /** @type {Function} */ ((/** @type {*} */ d) => addMonths(d, 3));
			startOfFn = /** @type {Function} */ (startOfMonth);
			seconds = incrementerValue * 3 * 30 * 24 * 60 * 60;
		} else if (key === MONTH) {
			incrementerFn = /** @type {Function} */ (addMonths);
			startOfFn = /** @type {Function} */ (startOfMonth);
			seconds = incrementerValue * 30 * 24 * 60 * 60;
		} else if (key === MINUTE) {
			incrementerFn = /** @type {Function} */ (addMinutes);
			startOfFn = /** @type {Function} */ (startOfMinute);
			seconds = incrementerValue * 60;
		}
	} else {
		throw new Error(`Invalid duration key: ${key}`);
	}

	return {
		intervalString,
		key,
		label: INTERVAL_LABELS[key],
		seconds,
		milliseconds: seconds * 1000,
		incrementerValue,
		incrementerFn,
		startOfFn: /** @type {Function} */ (startOfFn)
	};
}
