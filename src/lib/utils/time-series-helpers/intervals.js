import addYears from 'date-fns/addYears';

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

/** @type {Object.<string, string>} */
export const INTERVAL_LABELS = {};
INTERVAL_LABELS[YEAR] = 'Year';

/**
 *
 * @param {string} intervalString
 * @returns {{ key: string, label: string, incrementerValue: number, incrementerFn: Function | undefined }}}
 */
export function parse(intervalString) {
	const length = intervalString.length;
	const key = intervalString.charAt(length - 1);
	const incrementerValue = length === 1 ? 1 : parseInt(intervalString.substring(0, length - 1), 10);
	let incrementerFn;

	if (durationKeys.includes(key)) {
		if (key === YEAR) {
			incrementerFn = addYears;
		}
	} else {
		throw new Error(`Invalid duration key: ${key}`);
	}

	return {
		key,
		label: INTERVAL_LABELS[key],
		incrementerValue,
		incrementerFn
	};
}
