/**
 * Flat chart type definitions for Stratify.
 */

/**
 * @typedef {'bar' | 'bar-stacked' | 'bar-grouped' | 'column' | 'column-stacked' | 'column-grouped' | 'line' | 'area'} ChartType
 */

/**
 * @typedef {Object} ChartTypeOption
 * @property {ChartType} value
 * @property {string} label
 */

/** @type {ChartTypeOption[]} */
export const CHART_TYPES = [
	{ value: 'line', label: 'Line Chart' },
	{ value: 'area', label: 'Area Chart' },
	{ value: 'column', label: 'Column Chart' },
	{ value: 'column-stacked', label: 'Stacked Columns' },
	{ value: 'column-grouped', label: 'Grouped Columns' },
	{ value: 'bar', label: 'Bar Chart' },
	{ value: 'bar-stacked', label: 'Stacked Bars' },
	{ value: 'bar-grouped', label: 'Grouped Bars' }
];

/** Chart types that use time-series x-axis by default */
export const TIME_SERIES_TYPES = new Set(['area', 'line']);

/** Chart types that use horizontal layout (barX) */
export const HORIZONTAL_TYPES = new Set(['bar', 'bar-stacked', 'bar-grouped']);

/** Chart types that use vertical bars/columns (barY/rectY) */
export const COLUMN_TYPES = new Set(['column', 'column-stacked', 'column-grouped']);

/**
 * Migrate old chart type values to new ones.
 * @param {string} chartType
 * @returns {ChartType}
 */
export function migrateChartType(chartType) {
	/** @type {Record<string, ChartType>} */
	const migration = {
		'stacked-area': 'area',
		dot: 'line',
		'grouped-bar': 'column-grouped',
		'bar-stacked': 'column-stacked',
		'bar-horizontal': 'bar-stacked',
		'grouped-bar-horizontal': 'bar-grouped'
	};
	return migration[chartType] ?? /** @type {ChartType} */ (chartType);
}
