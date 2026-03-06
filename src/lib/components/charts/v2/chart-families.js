/**
 * Chart Family + Variant Mapping
 *
 * Maps chart families (Area, Bar, Line) to their variant chart types.
 * Used by ChartTypeSelector to render the two-row family/variant UI.
 */

/** @typedef {'area' | 'bar' | 'line'} ChartFamily */

/**
 * @typedef {Object} ChartFamilyConfig
 * @property {string} label - Display label for the family
 * @property {import('./types.js').ChartType[]} variants - Ordered list of chart type values
 * @property {Record<string, string>} variantLabels - Display labels keyed by chart type value
 * @property {import('./types.js').ChartType} defaultVariant - Default chart type when switching to this family
 */

/** @type {Record<ChartFamily, ChartFamilyConfig>} */
export const CHART_FAMILIES = {
	area: {
		label: 'Area',
		variants: ['stacked-area', 'area'],
		variantLabels: { 'stacked-area': 'Stacked', area: 'Overlay' },
		defaultVariant: 'stacked-area'
	},
	bar: {
		label: 'Bar',
		variants: ['bar-stacked', 'grouped-bar'],
		variantLabels: { 'bar-stacked': 'Stacked', 'grouped-bar': 'Grouped' },
		defaultVariant: 'bar-stacked'
	},
	line: {
		label: 'Line',
		variants: ['line'],
		variantLabels: {},
		defaultVariant: 'line'
	}
};

/** @type {ChartFamily[]} */
const FAMILY_ORDER = ['area', 'bar', 'line'];

/** @type {Record<string, ChartFamily>} */
const TYPE_TO_FAMILY = /** @type {Record<string, ChartFamily>} */ ({});
for (const [family, config] of Object.entries(CHART_FAMILIES)) {
	for (const variant of config.variants) {
		TYPE_TO_FAMILY[variant] = /** @type {ChartFamily} */ (family);
	}
}

/**
 * Get the family for a chart type.
 * @param {string} chartType
 * @returns {ChartFamily}
 */
export function getFamily(chartType) {
	return TYPE_TO_FAMILY[chartType] ?? 'area';
}

/**
 * Get available families based on data mode.
 * @param {boolean} isCategory
 * @returns {ChartFamily[]}
 */
export function getAvailableFamilies(isCategory) {
	return isCategory ? ['bar'] : FAMILY_ORDER;
}

/**
 * Get the default chart type for a family.
 * @param {ChartFamily} family
 * @returns {import('./types.js').ChartType}
 */
export function getDefaultForFamily(family) {
	return CHART_FAMILIES[family].defaultVariant;
}
