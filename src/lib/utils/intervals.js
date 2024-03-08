import { addMinutes, addMonths, addYears } from 'date-fns';

/**
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
const durationKeys = ['s', 'm', 'h', 'd', 'w', 'M', 'Q', 'Y'];

export const YEAR = 'Y';
export const MONTH = 'M';
export const MINUTES = 'm';

/** @type {Object.<string, string>} */
export const INTERVAL_LABELS = {};
INTERVAL_LABELS[YEAR] = 'Year';
INTERVAL_LABELS[MONTH] = 'Month';
INTERVAL_LABELS[MINUTES] = 'Minutes';

/**
 *
 * @param {string} intervalString
 * @returns {StatsInterval}
 */
export default function (intervalString) {
	const length = intervalString.length;
	const key = intervalString.charAt(length - 1);
	const incrementerValue = length === 1 ? 1 : parseInt(intervalString.substring(0, length - 1), 10);
	let incrementerFn;
	let seconds = 0;

	if (durationKeys.includes(key)) {
		if (key === YEAR) {
			incrementerFn = /** @type {Function} */ (addYears);
			seconds = incrementerValue * 365 * 24 * 60 * 60;
		} else if (key === MONTH) {
			incrementerFn = /** @type {Function} */ (addMonths);
			seconds = incrementerValue * 30 * 24 * 60 * 60;
		} else if (key === MINUTES) {
			incrementerFn = /** @type {Function} */ (addMinutes);
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
		incrementerFn
	};
}
