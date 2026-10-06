/**
 * Shared utilities for Stratify chart data normalisation.
 *
 * Used by server-side load functions to normalise raw Sanity chart
 * documents into a consistent shape with defaults applied.
 */

import { migrateChartType } from '$lib/stratify/chart-types.js';
import { DEFAULT_ANNOTATION_STYLE } from '$lib/stratify/annotation-data.js';
import { migratePreset } from '$lib/stratify/chart-styles.js';
import { migratePresetToPalette } from '$lib/stratify/colour-palettes.js';
import { CHART_FIELDS, chartFieldDefault, withChartDefaults } from '$lib/stratify/chart-fields.js';

/**
 * Collect the unique values of a column from a row array, preserving
 * first-seen order. Skips null/undefined.
 * @param {Array<Record<string, any>>} data
 * @param {string | null} columnKey
 * @returns {any[]}
 */
export function uniqueColumnValues(data, columnKey) {
	if (!columnKey) return [];
	/** @type {Set<any>} */
	const seen = new Set();
	/** @type {any[]} */
	const out = [];
	for (const row of data) {
		const v = row[columnKey];
		if (v == null || seen.has(v)) continue;
		seen.add(v);
		out.push(v);
	}
	return out;
}

/**
 * Return only columns that can be plotted on a numeric value axis.
 * Text columns remain available for colour, facets and tooltips.
 * @param {Array<{ key: string, isNumeric: boolean }>} allColumns
 * @param {string[]} seriesNames
 * @returns {string[]}
 */
export function getNumericSeriesNames(allColumns, seriesNames) {
	const numericKeys = allColumns.filter((column) => column.isNumeric).map((column) => column.key);
	return seriesNames.filter((name) => numericKeys.includes(name));
}

/**
 * Safely parse a JSON string, returning a fallback on failure.
 * @param {any} value
 * @param {any} fallback
 */
export function safeParseJSON(value, fallback) {
	if (typeof value !== 'string') return value ?? fallback;
	try {
		return JSON.parse(value);
	} catch {
		return fallback;
	}
}

/**
 * Read one registry field from a raw Sanity document: parse `json` fields
 * and fall back to the field's default when the value is missing.
 * @param {Record<string, any>} chart - Raw Sanity document
 * @param {import('./chart-fields.js').ChartField} field
 */
function readChartField(chart, field) {
	const value = chart[field.docKey ?? field.key];
	return field.encoding === 'json'
		? safeParseJSON(value, chartFieldDefault(field))
		: (value ?? chartFieldDefault(field));
}

/**
 * Parse the JSON-encoded fields of a raw Sanity document in place of their
 * stored strings and expose renamed fields under their snapshot key (e.g.
 * `version`), keeping every other field (including Sanity metadata and
 * ownership) as stored.
 * @param {Record<string, any>} chart - Raw Sanity document
 * @returns {Record<string, any>}
 */
export function decodeChartFields(chart) {
	const decoded = { ...chart };
	for (const field of CHART_FIELDS) {
		if (field.encoding === 'json' || field.docKey) {
			decoded[field.key] = readChartField(chart, field);
		}
	}
	return decoded;
}

/**
 * Every registry field of a decoded chart or snapshot, defaulted and with
 * legacy values migrated (chart type, style preset, and a palette derived
 * from an old preset). The single definition of what a stored chart means:
 * the builder loads it (`StratifyPlotProject.loadFromSnapshot`), the save
 * session compares against it, and `normaliseChart` renders from it.
 * @param {Record<string, any>} raw - Decoded chart document or snapshot
 * @returns {Record<string, any>}
 */
export function normaliseSnapshot(raw) {
	const values = withChartDefaults(raw);
	return {
		...values,
		annotationItems: Array.isArray(raw.annotationItems) ? raw.annotationItems : [],
		annotationStyle: { ...DEFAULT_ANNOTATION_STYLE, ...(raw.annotationStyle ?? {}) },
		annotations: Array.isArray(raw.annotations) ? raw.annotations : [],
		chartType: migrateChartType(values.chartType),
		stylePreset: migratePreset(values.stylePreset),
		colourPalette: raw.colourPalette ?? migratePresetToPalette(raw.stylePreset ?? 'oe')
	};
}

/**
 * Normalise a raw Sanity stratifyChart document for rendering: JSON fields
 * parsed, defaults and migrations applied (`normaliseSnapshot`). Only chart
 * settings are returned (no meta, ownership or Sanity fields other than
 * `_id`).
 * @param {Record<string, any>} chart - Raw Sanity document
 * @returns {Record<string, any>}
 */
export function normaliseChart(chart) {
	const settings = normaliseSnapshot(decodeChartFields(chart));
	/** @type {Record<string, any>} */
	const normalised = { _id: chart._id };
	for (const field of CHART_FIELDS) {
		if (field.group !== 'meta') normalised[field.key] = settings[field.key];
	}
	return normalised;
}
