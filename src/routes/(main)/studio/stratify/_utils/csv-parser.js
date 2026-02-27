/**
 * CSV/TSV Parser for Stratify
 *
 * Parses CSV or tab-separated text into the StratumChart data format.
 * Auto-detects delimiter, parses dates in the first column, and extracts
 * numeric series from remaining columns.
 */

import { parse as dateParse, isValid } from 'date-fns';
import { assignColours } from './colour-palette.js';

/**
 * @typedef {Object} ParseResult
 * @property {Array<{time: number, date: Date, [key: string]: any}>} data
 * @property {string[]} seriesNames
 * @property {Record<string, string>} seriesLabels
 * @property {Record<string, string>} seriesColours
 * @property {string[]} errors
 */

const DATE_FORMATS = [
	'yyyy-MM-dd',
	'yyyy-MM-dd HH:mm',
	'yyyy-MM-dd HH:mm:ss',
	"yyyy-MM-dd'T'HH:mm:ss",
	"yyyy-MM-dd'T'HH:mm:ssXXX",
	'dd/MM/yyyy',
	'dd/MM/yyyy HH:mm',
	'MM/dd/yyyy',
	'MM/dd/yyyy HH:mm',
	'd MMM yyyy',
	'd MMMM yyyy',
	'MMM d, yyyy',
	'MMMM d, yyyy',
	'yyyy'
];

/**
 * Detect the delimiter used in CSV text.
 * Checks tab first (for spreadsheet pastes), then comma, then semicolon.
 * @param {string} text
 * @returns {string}
 */
function detectDelimiter(text) {
	const firstLine = text.split('\n')[0] || '';

	// Check tab first (spreadsheet pastes)
	if (firstLine.includes('\t')) return '\t';
	// Then comma
	if (firstLine.includes(',')) return ',';
	// Then semicolon
	if (firstLine.includes(';')) return ';';

	// Default to comma
	return ',';
}

/**
 * Parse a date string using multiple format attempts.
 * @param {string} str
 * @returns {Date | null}
 */
function parseDate(str) {
	const trimmed = str.trim();
	if (!trimmed) return null;

	// Try native Date constructor first (handles ISO 8601 well)
	const native = new Date(trimmed);
	if (isValid(native) && !isNaN(native.getTime())) {
		return native;
	}

	// Try each format with date-fns
	const ref = new Date();
	for (const fmt of DATE_FORMATS) {
		const parsed = dateParse(trimmed, fmt, ref);
		if (isValid(parsed)) {
			return parsed;
		}
	}

	return null;
}

/**
 * Parse a numeric string, stripping commas and whitespace.
 * @param {string} str
 * @returns {number | null}
 */
function parseNumber(str) {
	const trimmed = str.trim();
	if (trimmed === '' || trimmed === '-') return null;

	const cleaned = trimmed.replace(/,/g, '');
	const num = Number(cleaned);
	return isNaN(num) ? null : num;
}

/**
 * Convert a header string to a safe key name.
 * @param {string} header
 * @returns {string}
 */
function toKey(header) {
	return header
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_|_$/g, '');
}

/**
 * Parse CSV or TSV text into StratumChart-compatible data.
 * @param {string} csvText
 * @param {Record<string, string>} [existingColours] - Preserve existing colour assignments
 * @returns {ParseResult}
 */
export function parseCSV(csvText, existingColours = {}) {
	/** @type {string[]} */
	const errors = [];

	if (!csvText.trim()) {
		return { data: [], seriesNames: [], seriesLabels: {}, seriesColours: {}, errors };
	}

	const delimiter = detectDelimiter(csvText);
	const lines = csvText.trim().split('\n');

	if (lines.length < 2) {
		errors.push('Need at least a header row and one data row.');
		return { data: [], seriesNames: [], seriesLabels: {}, seriesColours: {}, errors };
	}

	// Parse headers
	const headers = lines[0].split(delimiter).map((h) => h.trim());
	if (headers.length < 2) {
		errors.push('Need at least two columns (date + one series).');
		return { data: [], seriesNames: [], seriesLabels: {}, seriesColours: {}, errors };
	}

	const dateHeader = headers[0];
	const seriesHeaders = headers.slice(1);
	const seriesNames = seriesHeaders.map(toKey);
	const seriesLabels = Object.fromEntries(seriesNames.map((key, i) => [key, seriesHeaders[i]]));

	// Preserve existing colours, assign new ones for new series
	const freshColours = assignColours(seriesNames);
	const seriesColours = Object.fromEntries(
		seriesNames.map((key) => [key, existingColours[key] || freshColours[key]])
	);

	// Parse data rows
	/** @type {Array<{time: number, date: Date, [key: string]: any}>} */
	const data = [];
	let dateErrors = 0;

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		const cells = line.split(delimiter);
		const date = parseDate(cells[0] || '');

		if (!date) {
			dateErrors++;
			if (dateErrors <= 3) {
				errors.push(`Row ${i + 1}: could not parse date "${cells[0]?.trim()}".`);
			}
			continue;
		}

		/** @type {{time: number, date: Date, [key: string]: any}} */
		const row = {
			time: date.getTime(),
			date
		};

		for (let j = 0; j < seriesNames.length; j++) {
			row[seriesNames[j]] = parseNumber(cells[j + 1] || '');
		}

		data.push(row);
	}

	if (dateErrors > 3) {
		errors.push(`...and ${dateErrors - 3} more date parsing errors.`);
	}

	// Sort by time
	data.sort((a, b) => a.time - b.time);

	return { data, seriesNames, seriesLabels, seriesColours, errors };
}
