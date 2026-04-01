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
 * @typedef {{ key: string, label: string, isNumeric: boolean }} ColumnMeta
 */

/**
 * @typedef {Object} ParseResult
 * @property {'time-series' | 'category'} mode
 * @property {Array<{[key: string]: any}>} data
 * @property {string[]} seriesNames
 * @property {Record<string, string>} seriesLabels
 * @property {Record<string, string>} seriesColours
 * @property {Record<string, string>} [categoryLabels] - Map of category value to original label (category mode only)
 * @property {ColumnMeta[]} allColumns - Metadata for every column (including the first)
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
	const trimmed = str.trim().replace(/^["']|["']$/g, '');
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
	const trimmed = str.trim().replace(/^["']|["']$/g, '');
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

/** @type {ParseResult} */
const EMPTY_RESULT = {
	mode: 'time-series',
	data: [],
	seriesNames: [],
	seriesLabels: {},
	seriesColours: {},
	allColumns: [],
	errors: []
};

/**
 * Parse CSV or TSV text into StratumChart-compatible data.
 * Auto-detects whether the first column contains dates (time-series mode)
 * or text labels (category mode), unless overridden by displayMode.
 * @param {string} csvText
 * @param {Record<string, string>} [existingColours] - Preserve existing colour assignments
 * @param {'auto' | 'time-series' | 'category'} [displayMode='auto'] - Override auto-detection
 * @returns {ParseResult}
 */
export function parseCSV(csvText, existingColours = {}, displayMode = 'auto') {
	/** @type {string[]} */
	const errors = [];

	if (!csvText.trim()) {
		return { ...EMPTY_RESULT, errors };
	}

	const delimiter = detectDelimiter(csvText);
	const lines = csvText.trim().split('\n');

	if (lines.length < 2) {
		errors.push('Need at least a header row and one data row.');
		return { ...EMPTY_RESULT, errors };
	}

	// Parse headers (strip surrounding quotes)
	const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''));
	if (headers.length < 2) {
		errors.push('Need at least two columns (date/category + one series).');
		return { ...EMPTY_RESULT, errors };
	}

	const seriesHeaders = headers.slice(1);
	const seriesNames = seriesHeaders.map(toKey);
	const seriesLabels = Object.fromEntries(seriesNames.map((key, i) => [key, seriesHeaders[i]]));

	// Preserve existing colours, assign new ones for new series
	const freshColours = assignColours(seriesNames);
	const seriesColours = Object.fromEntries(
		seriesNames.map((key) => [key, existingColours[key] || freshColours[key]])
	);

	const rawDataLines = lines.slice(1);

	// Determine mode: explicit override or auto-detect from first column content
	let isCategory;
	if (displayMode === 'category') {
		isCategory = true;
	} else if (displayMode === 'time-series') {
		isCategory = false;
	} else {
		// Auto-detect: probe first column for date-parseable values
		let nonEmptyCount = 0;
		let dateSuccesses = 0;
		for (const line of rawDataLines) {
			if (!line.trim()) continue;
			nonEmptyCount++;
			const firstCell = line.split(delimiter)[0] || '';
			if (parseDate(firstCell)) dateSuccesses++;
		}
		isCategory = nonEmptyCount > 0 && dateSuccesses / nonEmptyCount < 0.5;
	}

	if (isCategory) {
		return parseCategoryData(
			rawDataLines,
			delimiter,
			headers,
			seriesNames,
			seriesLabels,
			seriesColours,
			errors
		);
	}

	// Build allColumns for time-series (first column is date, rest are numeric)
	/** @type {ColumnMeta[]} */
	const allColumns = [
		{ key: toKey(headers[0]), label: headers[0], isNumeric: false },
		...seriesNames.map((key, i) => ({ key, label: seriesHeaders[i], isNumeric: true }))
	];

	return parseTimeSeriesData(
		rawDataLines,
		delimiter,
		seriesNames,
		seriesLabels,
		seriesColours,
		allColumns,
		errors
	);
}

/**
 * Parse rows as time-series data (first column = dates).
 * @param {string[]} dataLines
 * @param {string} delimiter
 * @param {string[]} seriesNames
 * @param {Record<string, string>} seriesLabels
 * @param {Record<string, string>} seriesColours
 * @param {ColumnMeta[]} allColumns
 * @param {string[]} errors
 * @returns {ParseResult}
 */
function parseTimeSeriesData(
	dataLines,
	delimiter,
	seriesNames,
	seriesLabels,
	seriesColours,
	allColumns,
	errors
) {
	/** @type {Array<{[key: string]: any}>} */
	const data = [];
	let dateErrors = 0;

	for (let i = 0; i < dataLines.length; i++) {
		if (!dataLines[i].trim()) continue;
		const cells = dataLines[i].split(delimiter);
		const dateStr = (cells[0] || '').trim();
		const date = parseDate(dateStr);

		if (!date) {
			dateErrors++;
			if (dateErrors <= 3) {
				errors.push(`Row ${i + 2}: could not parse date "${dateStr}".`);
			}
			continue;
		}

		/** @type {{[key: string]: any}} */
		const row = { time: date.getTime(), date, _dateStr: dateStr, _lineIndex: i + 1 };

		for (let j = 0; j < seriesNames.length; j++) {
			row[seriesNames[j]] = parseNumber(cells[j + 1] || '');
		}

		data.push(row);
	}

	if (dateErrors > 3) {
		errors.push(`...and ${dateErrors - 3} more date parsing errors.`);
	}

	data.sort((a, b) => a.time - b.time);

	return {
		mode: 'time-series',
		data,
		seriesNames,
		seriesLabels,
		seriesColours,
		allColumns,
		errors
	};
}

/**
 * Parse rows as category data (first column = text labels).
 * Detects text columns (>80% non-numeric) and preserves raw text values.
 * @param {string[]} dataLines
 * @param {string} delimiter
 * @param {string[]} headers - All column headers (including first)
 * @param {string[]} seriesNames
 * @param {Record<string, string>} seriesLabels
 * @param {Record<string, string>} seriesColours
 * @param {string[]} errors
 * @returns {ParseResult}
 */
function parseCategoryData(
	dataLines,
	delimiter,
	headers,
	seriesNames,
	seriesLabels,
	seriesColours,
	errors
) {
	/** @type {Array<{[key: string]: any}>} */
	const data = [];
	/** @type {Record<string, string>} */
	const categoryLabels = {};

	// First pass: parse all cells and track numeric success per column
	/** @type {Record<string, { total: number, numeric: number }>} */
	const columnStats = {};
	for (const name of seriesNames) {
		columnStats[name] = { total: 0, numeric: 0 };
	}

	/** @type {Array<{ label: string, cells: string[], lineIndex: number }>} */
	const parsedLines = [];

	for (let i = 0; i < dataLines.length; i++) {
		if (!dataLines[i].trim()) continue;
		const cells = dataLines[i].split(delimiter);
		const label = (cells[0] || '').trim();
		if (!label) continue;
		parsedLines.push({ label, cells, lineIndex: i + 1 });

		for (let j = 0; j < seriesNames.length; j++) {
			const raw = (cells[j + 1] || '').trim();
			if (raw !== '' && raw !== '-') {
				columnStats[seriesNames[j]].total++;
				if (parseNumber(raw) !== null) {
					columnStats[seriesNames[j]].numeric++;
				}
			}
		}
	}

	// Determine which columns are text (>80% non-numeric)
	/** @type {Set<string>} */
	const textColumnSet = new Set();
	for (const name of seriesNames) {
		const stats = columnStats[name];
		if (stats.total > 0 && stats.numeric / stats.total < 0.2) {
			textColumnSet.add(name);
		}
	}

	// Build allColumns metadata
	/** @type {ColumnMeta[]} */
	const allColumns = [
		{ key: toKey(headers[0]), label: headers[0], isNumeric: false },
		...seriesNames.map((key, i) => ({
			key,
			label: headers[i + 1],
			isNumeric: !textColumnSet.has(key)
		}))
	];

	// Second pass: build data rows with text values preserved
	for (let i = 0; i < parsedLines.length; i++) {
		const { label, cells, lineIndex } = parsedLines[i];

		/** @type {{[key: string]: any}} */
		const row = { category: label, _index: i, _lineIndex: lineIndex };
		categoryLabels[label] = label;

		for (let j = 0; j < seriesNames.length; j++) {
			const raw = (cells[j + 1] || '').trim();
			if (textColumnSet.has(seriesNames[j])) {
				// Preserve raw text for text columns
				row[seriesNames[j]] = raw || null;
			} else {
				row[seriesNames[j]] = parseNumber(cells[j + 1] || '');
			}
		}

		data.push(row);
	}

	return {
		mode: 'category',
		data,
		seriesNames,
		seriesLabels,
		seriesColours,
		categoryLabels,
		allColumns,
		errors
	};
}
