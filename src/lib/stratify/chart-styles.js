/**
 * Chart themes for Stratify.
 *
 * Two themes controlling typography and chart styling only.
 * Colours are handled separately by the palette system.
 */

/**
 * @typedef {Object} ChartTheme
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {{ fontFamily: string, fontSize: string, titleFont: string, titleSize: string, titleWeight: string }} typography
 * @property {{ background: string, gridStroke: string, axisStroke: string, ruleStroke: string }} chart
 */

/** @type {ChartTheme[]} */
export const CHART_THEMES = [
	{
		id: 'sans',
		name: 'Sans',
		description: 'Clean sans-serif (DM Sans)',
		typography: {
			fontFamily: '"DM Sans", system-ui, -apple-system, sans-serif',
			fontSize: '11px',
			titleFont: '"DM Sans", system-ui, -apple-system, sans-serif',
			titleSize: '14px',
			titleWeight: '600'
		},
		chart: {
			background: 'transparent',
			gridStroke: '#efefef',
			axisStroke: '#33333344',
			ruleStroke: '#353535'
		}
	},
	{
		id: 'mono',
		name: 'Mono',
		description: 'Technical monospace (DM Mono)',
		typography: {
			fontFamily: '"DM Mono", ui-monospace, monospace',
			fontSize: '10px',
			titleFont: '"DM Mono", ui-monospace, monospace',
			titleSize: '14px',
			titleWeight: '600'
		},
		chart: {
			background: 'transparent',
			gridStroke: '#e5e5e5',
			axisStroke: '#888',
			ruleStroke: '#888'
		}
	}
];

/** @type {Record<string, ChartTheme>} */
export const THEMES_BY_ID = Object.fromEntries(CHART_THEMES.map((t) => [t.id, t]));

/**
 * Get a theme by ID, falling back to 'sans'.
 * @param {string} id
 * @returns {ChartTheme}
 */
export function getPreset(id) {
	return THEMES_BY_ID[id] ?? THEMES_BY_ID['sans'];
}

/**
 * Migrate old preset IDs to new theme IDs.
 * @param {string} presetId
 * @returns {string}
 */
export function migratePreset(presetId) {
	/** @type {Record<string, string>} */
	const map = {
		oe: 'sans',
		default: 'mono',
		'warm-earth': 'sans',
		'cool-slate': 'sans',
		vibrant: 'sans',
		'muted-pastel': 'sans'
	};
	return map[presetId] ?? presetId;
}

/**
 * Build an Observable Plot `style` object from a theme.
 * @param {string} themeId
 * @returns {{ fontFamily: string, fontSize: string, background: string, overflow: string }}
 */
export function getPlotStyle(themeId) {
	const theme = getPreset(themeId);
	return {
		fontFamily: theme.typography.fontFamily,
		fontSize: theme.typography.fontSize,
		background: theme.chart.background,
		overflow: 'visible'
	};
}
