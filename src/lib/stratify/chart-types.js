/**
 * Flat chart type definitions for Stratify.
 */

/**
 * @typedef {'bar' | 'bar-stacked' | 'bar-grouped' | 'column' | 'column-stacked' | 'column-grouped' | 'line' | 'area' | 'waterfall' | 'waterfall-horizontal' | 'map'} ChartType
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
	{ value: 'bar-grouped', label: 'Grouped Bars' },
	{ value: 'waterfall', label: 'Waterfall' },
	{ value: 'waterfall-horizontal', label: 'Waterfall (Horizontal)' },
	{ value: 'map', label: 'Map' }
];

/** Chart types that use time-series x-axis by default */
export const TIME_SERIES_TYPES = new Set(['area', 'line']);

/** Chart types that use horizontal layout (barX) */
export const HORIZONTAL_TYPES = new Set(['bar', 'bar-stacked', 'bar-grouped', 'waterfall-horizontal']);

/** Chart types that use vertical bars/columns (barY/rectY) */
export const COLUMN_TYPES = new Set(['column', 'column-stacked', 'column-grouped', 'waterfall']);

/** Chart types that render a running-cumulative waterfall (vertical or horizontal) */
export const WATERFALL_TYPES = new Set(['waterfall', 'waterfall-horizontal']);

/** Semantic bar roles for the waterfall "Waterfall colours" mode. The first bar
 *  is "starting", deltas are "increase"/"decrease" by sign, and the appended bar
 *  is "total". Starting and total share a colour by default. */
export const WATERFALL_ROLE_KEYS = ['starting', 'increase', 'decrease', 'total'];

/** @type {Record<string, string>} Default display labels for the waterfall roles */
export const WATERFALL_ROLE_LABELS = {
	starting: 'Starting',
	increase: 'Increase',
	decrease: 'Decrease',
	total: 'Total'
};

/**
 * Default semantic colours from a theme swatch list: starting & total share the
 * first colour; increase & decrease take the next two.
 * @param {string[]} [swatches]
 * @returns {Record<string, string>}
 */
export function getWaterfallRoleColours(swatches) {
	const [a = '#4E79A7', b = '#59A14F', c = '#E15759'] = swatches ?? [];
	return { starting: a, increase: b, decrease: c, total: a };
}

/** Chart types that render category bars side-by-side via fx/fy faceting */
export const GROUPED_TYPES = new Set(['bar-grouped', 'column-grouped']);

/** Chart types that render a geographic map instead of an x/y plot */
export const MAP_TYPES = new Set(['map']);

// ── Line Style Definitions ─────────────────────────────────────

/**
 * @typedef {'solid' | 'dashed' | 'dotted' | 'dash-dot' | 'long-dash'} LineStyle
 */

/** @type {Array<{value: LineStyle, label: string}>} */
export const LINE_STYLES = [
	{ value: 'solid', label: 'Solid' },
	{ value: 'dashed', label: 'Dashed' },
	{ value: 'dotted', label: 'Dotted' },
	{ value: 'dash-dot', label: 'Dash-Dot' },
	{ value: 'long-dash', label: 'Long Dash' }
];

/**
 * Map a LineStyle value to an SVG stroke-dasharray string.
 * Returns undefined for solid/unset (no dasharray needed).
 * @param {string | undefined} style
 * @returns {string | undefined}
 */
export function getLineDasharray(style) {
	switch (style) {
		case 'dashed':
			return '8,4';
		case 'dotted':
			return '2,2';
		case 'dash-dot':
			return '8,4,2,4';
		case 'long-dash':
			return '12,6';
		default:
			return undefined;
	}
}

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
