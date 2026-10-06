/**
 * Short, human-readable descriptions of chart field values, for conflict
 * prompts and (later) the change history.
 */

const MAX_LENGTH = 80;
const MAX_LISTED = 4;
const HEX_COLOUR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/**
 * @param {unknown} value
 * @returns {value is string}
 */
export function isColourValue(value) {
	return typeof value === 'string' && HEX_COLOUR.test(value);
}

/** @param {string} text */
function truncate(text) {
	return text.length > MAX_LENGTH ? `${text.slice(0, MAX_LENGTH - 1)}…` : text;
}

/** @param {number} count @param {string} noun */
function plural(count, noun) {
	return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/**
 * Rows and columns of delimited text, e.g. "12 rows × 3 columns".
 * @param {string} csvText
 */
function describeData(csvText) {
	const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
	if (lines.length === 0) return 'No data';
	const columns = lines[0].split(lines[0].includes('\t') ? '\t' : ',').length;
	return `${plural(lines.length - 1, 'row')} × ${plural(columns, 'column')}`;
}

/** @param {unknown} value @returns {string} */
function describeScalar(value) {
	if (value === null || value === undefined || value === '') return 'None';
	if (typeof value === 'boolean') return value ? 'On' : 'Off';
	if (typeof value === 'object') return JSON.stringify(value);
	return String(value);
}

/**
 * @param {string} field - Registry key
 * @param {unknown} value
 * @returns {string}
 */
export function describeFieldValue(field, value) {
	if (field === 'csvText') return typeof value === 'string' ? describeData(value) : 'No data';

	if (Array.isArray(value)) {
		if (value.length === 0) return 'None';
		if (value.length > MAX_LISTED || value.some((item) => typeof item === 'object')) {
			return plural(value.length, 'item');
		}
		return truncate(value.map(describeScalar).join(', '));
	}

	if (value && typeof value === 'object') {
		const entries = Object.entries(value);
		if (entries.length === 0) return 'None';
		if (entries.length > MAX_LISTED || entries.some(([, item]) => typeof item === 'object')) {
			return plural(entries.length, 'setting');
		}
		return truncate(entries.map(([key, item]) => `${key}: ${describeScalar(item)}`).join(', '));
	}

	return truncate(describeScalar(value));
}
