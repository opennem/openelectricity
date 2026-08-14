import { parseDate, toKey } from './csv-parser.js';

/** @typedef {'rule' | 'point'} AnnotationDataType */

/**
 * @typedef {Object} AnnotationMappings
 * @property {string | null} typeColumn
 * @property {string | null} xColumn
 * @property {string | null} labelColumn
 * @property {string | null} colourColumn
 * @property {string | null} yColumn
 * @property {string | null} seriesColumn
 * @property {string | null} axisColumn
 * @property {AnnotationDataType} defaultType
 */

/**
 * @typedef {Object} AnnotationStyleConfig
 * @property {string} defaultColour
 * @property {'solid' | 'dashed' | 'dotted'} lineStyle
 * @property {number} lineWidth
 * @property {number} fontSize
 * @property {'normal' | 'bold'} fontWeight
 * @property {number} pointRadius
 */

/**
 * @typedef {Object} DataAnnotation
 * @property {AnnotationDataType} type
 * @property {Date | number | string} x
 * @property {string} rawX
 * @property {string} text
 * @property {string} colour
 * @property {number | null} y
 * @property {string | null} series
 * @property {'left' | 'right'} axis
 * @property {number} rowNumber
 */

/**
 * @typedef {Object} AnnotationRowOption
 * @property {string} [colour]
 * @property {'y' | 'series'} [positionBy]
 * @property {string | null} [series]
 * @property {'left' | 'right'} [axis]
 */

export const DEFAULT_ANNOTATION_MAPPINGS = /** @type {AnnotationMappings} */ ({
	typeColumn: null,
	xColumn: null,
	labelColumn: null,
	colourColumn: null,
	yColumn: null,
	seriesColumn: null,
	axisColumn: null,
	defaultType: 'rule'
});

export const DEFAULT_ANNOTATION_STYLE = /** @type {AnnotationStyleConfig} */ ({
	defaultColour: '#666666',
	lineStyle: 'dashed',
	lineWidth: 1,
	fontSize: 11,
	fontWeight: 'normal',
	pointRadius: 4
});

const HEADER_ALIASES = {
	typeColumn: ['type', 'annotation_type'],
	xColumn: ['date', 'datetime', 'date_time', 'time', 'timestamp', 'x'],
	labelColumn: ['label', 'text', 'annotation', 'event', 'name'],
	colourColumn: ['colour', 'color', 'annotation_colour', 'annotation_color'],
	yColumn: ['y', 'value'],
	seriesColumn: ['series', 'series_name'],
	axisColumn: ['axis', 'y_axis']
};

/**
 * Parse a delimited row, including quoted values and escaped quotes.
 * @param {string} line
 * @param {string} delimiter
 * @returns {string[]}
 */
function parseDelimitedRow(line, delimiter) {
	/** @type {string[]} */
	const cells = [];
	let cell = '';
	let quoted = false;
	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		if (char === '"') {
			if (quoted && line[i + 1] === '"') {
				cell += '"';
				i++;
			} else {
				quoted = !quoted;
			}
		} else if (char === delimiter && !quoted) {
			cells.push(cell.trim());
			cell = '';
		} else {
			cell += char;
		}
	}
	cells.push(cell.trim());
	return cells;
}

/** @param {string} text */
function detectDelimiter(text) {
	const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
	if (firstLine.includes('\t')) return '\t';
	if (firstLine.includes(';') && !firstLine.includes(',')) return ';';
	return ',';
}

/**
 * Parse an annotation CSV/TSV without coercing its values.
 * @param {string} csvText
 */
export function parseAnnotationTable(csvText) {
	if (!csvText.trim()) return { columns: [], rows: [], errors: [] };
	const delimiter = detectDelimiter(csvText);
	const lines = csvText.trim().split(/\r?\n/);
	const labels = parseDelimitedRow(lines[0] ?? '', delimiter);
	const keys = labels.map(toKey);
	/** @type {string[]} */
	const errors = [];
	if (labels.length < 2) errors.push('Need at least two annotation columns.');
	if (keys.some((key) => !key)) errors.push('Annotation column headers cannot be blank.');
	if (new Set(keys).size !== keys.length) errors.push('Annotation column headers must be unique.');

	const rows = [];
	for (let i = 1; i < lines.length; i++) {
		if (!lines[i]?.trim()) continue;
		const cells = parseDelimitedRow(lines[i], delimiter);
		/** @type {Record<string, string>} */
		const values = {};
		for (let column = 0; column < keys.length; column++) {
			values[keys[column]] = cells[column] ?? '';
		}
		rows.push({ rowNumber: i + 1, values });
	}

	return {
		columns: keys.map((key, index) => ({ key, label: labels[index] })),
		rows,
		errors
	};
}

/**
 * Infer mappings from common headers, falling back to the first two columns
 * for X and Label.
 * @param {Array<{key: string, label: string}>} columns
 * @returns {AnnotationMappings}
 */
export function inferAnnotationMappings(columns) {
	const keys = columns.map((column) => column.key);
	/** @type {AnnotationMappings} */
	const mappings = { ...DEFAULT_ANNOTATION_MAPPINGS };
	/** @param {string[]} aliases */
	const find = (aliases) => aliases.find((alias) => keys.includes(alias)) ?? null;
	mappings.typeColumn = find(HEADER_ALIASES.typeColumn);
	mappings.xColumn = find(HEADER_ALIASES.xColumn);
	mappings.labelColumn = find(HEADER_ALIASES.labelColumn);
	mappings.colourColumn = find(HEADER_ALIASES.colourColumn);
	mappings.yColumn = find(HEADER_ALIASES.yColumn);
	mappings.seriesColumn = find(HEADER_ALIASES.seriesColumn);
	mappings.axisColumn = find(HEADER_ALIASES.axisColumn);
	mappings.xColumn ??= keys[0] ?? null;
	mappings.labelColumn ??= keys[1] ?? null;
	return mappings;
}

/** @param {string} value */
export function isValidAnnotationColour(value) {
	const trimmed = value.trim();
	return (
		/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed) ||
		/^rgba?\(\s*[\d.%]+\s*,\s*[\d.%]+\s*,\s*[\d.%]+(?:\s*,\s*[\d.%]+)?\s*\)$/i.test(trimmed) ||
		/^hsla?\(.+\)$/i.test(trimmed) ||
		/^[a-z]+$/i.test(trimmed)
	);
}

/**
 * Compile raw annotation rows for a chart mode.
 * @param {ReturnType<typeof parseAnnotationTable>} table
 * @param {'time-series' | 'category' | 'linear'} mode
 * @param {AnnotationMappings} mappings
 * @param {AnnotationStyleConfig} style
 * @param {Record<string, AnnotationRowOption>} [rowOptions]
 */
export function compileAnnotationData(table, mode, mappings, style, rowOptions = {}) {
	/** @type {DataAnnotation[]} */
	const annotations = [];
	/** @type {string[]} */
	const errors = [...table.errors];
	/** @type {string[]} */
	const warnings = [];
	if (table.errors.length) return { annotations, errors, warnings };
	if (!table.rows.length) return { annotations, errors, warnings };
	if (!mappings.xColumn || !mappings.labelColumn) {
		errors.push('Choose X and Label annotation columns.');
		return { annotations, errors, warnings };
	}

	for (const row of table.rows) {
		const values = row.values;
		const rowOption = rowOptions[String(row.rowNumber)] ?? {};
		const typeValue = mappings.typeColumn
			? values[mappings.typeColumn]?.trim().toLowerCase()
			: mappings.defaultType;
		if (typeValue !== 'rule' && typeValue !== 'point') {
			errors.push(`Row ${row.rowNumber}: annotation type must be "rule" or "point".`);
			continue;
		}

		const rawX = values[mappings.xColumn]?.trim() ?? '';
		const label = values[mappings.labelColumn]?.trim() ?? '';
		if (!rawX || !label) {
			errors.push(`Row ${row.rowNumber}: X and Label are required.`);
			continue;
		}

		/** @type {Date | number | string | null} */
		let x = rawX;
		if (mode === 'time-series') x = parseDate(rawX);
		if (mode === 'linear') {
			const parsed = Number(rawX.replace(/,/g, ''));
			x = Number.isFinite(parsed) ? parsed : null;
		}
		if (x == null) {
			errors.push(`Row ${row.rowNumber}: could not parse X value "${rawX}".`);
			continue;
		}

		const rawColour =
			rowOption.colour?.trim() ||
			(mappings.colourColumn ? values[mappings.colourColumn]?.trim() : '');
		let colour = isValidAnnotationColour(style.defaultColour)
			? style.defaultColour
			: DEFAULT_ANNOTATION_STYLE.defaultColour;
		if (rawColour) {
			if (isValidAnnotationColour(rawColour)) colour = rawColour;
			else warnings.push(`Row ${row.rowNumber}: invalid colour "${rawColour}"; using fallback.`);
		}

		const mappedSeries = mappings.seriesColumn
			? values[mappings.seriesColumn]?.trim() || null
			: null;
		const positionBy = rowOption.positionBy ?? (rowOption.series || mappedSeries ? 'series' : 'y');
		const rawY =
			typeValue === 'point' && positionBy === 'y' && mappings.yColumn
				? values[mappings.yColumn]?.trim()
				: '';
		const parsedY = rawY !== '' && rawY != null ? Number(String(rawY).replace(/,/g, '')) : NaN;
		const y = Number.isFinite(parsedY) ? parsedY : null;
		if (rawY !== '' && rawY != null && y == null) {
			errors.push(`Row ${row.rowNumber}: Y must be a finite number.`);
			continue;
		}
		const series =
			typeValue === 'point' && positionBy === 'series'
				? Object.prototype.hasOwnProperty.call(rowOption, 'series')
					? rowOption.series?.trim() || null
					: mappedSeries
				: null;
		const rawAxis =
			typeValue === 'point'
				? rowOption.axis
					? rowOption.axis
					: mappings.axisColumn
						? values[mappings.axisColumn]?.trim().toLowerCase()
						: ''
				: '';
		if (rawAxis && rawAxis !== 'left' && rawAxis !== 'right') {
			errors.push(`Row ${row.rowNumber}: Axis must be "left" or "right".`);
			continue;
		}
		if (typeValue === 'point' && y == null && !series) {
			errors.push(`Row ${row.rowNumber}: point annotations need a Y value or Series.`);
			continue;
		}

		annotations.push({
			type: typeValue,
			x,
			rawX,
			text: label,
			colour,
			y,
			series,
			axis: rawAxis === 'right' ? 'right' : 'left',
			rowNumber: row.rowNumber
		});
	}

	return { annotations, errors, warnings };
}
