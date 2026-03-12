/**
 * CSS custom property-based theme system for Observable Plot charts.
 *
 * Provides two theme presets (terminal and openelectricity) and exposes
 * tokens as both a CSS variables string and an Observable Plot style object.
 *
 * @typedef {'terminal' | 'openelectricity'} PlotThemeId
 */

/**
 * @typedef {Object} PlotThemeTokens
 * @property {string} fontFamily
 * @property {string} fontSize
 * @property {string} headerBg
 * @property {string} headerBorder
 * @property {string} titleColour
 * @property {string} subtitleColour
 * @property {string} legendBg
 * @property {string} legendBorder
 * @property {string} legendTextColour
 * @property {string} tooltipBg
 * @property {string} tooltipDateBg
 * @property {string} tooltipTextColour
 * @property {string} crosshairColour
 * @property {string} chartBg
 */

/** @type {Record<PlotThemeId, PlotThemeTokens>} */
const THEME_PRESETS = {
	terminal: {
		fontFamily: 'DM Mono, monospace',
		fontSize: '10px',
		headerBg: 'rgba(250, 249, 246, 0.5)',
		headerBorder: '#F1F0ED',
		titleColour: '#353535',
		subtitleColour: '#6A6A6A',
		legendBg: 'rgba(250, 249, 246, 0.5)',
		legendBorder: '#F1F0ED',
		legendTextColour: '#6A6A6A',
		tooltipBg: '#FAF9F6',
		tooltipDateBg: 'rgba(255, 255, 255, 0.4)',
		tooltipTextColour: '#6A6A6A',
		crosshairColour: 'rgba(106, 106, 106, 0.4)',
		chartBg: 'transparent'
	},
	openelectricity: {
		fontFamily: 'DM Sans, sans-serif',
		fontSize: '10px',
		headerBg: '#ffffff',
		headerBorder: '#F1F0ED',
		titleColour: '#353535',
		subtitleColour: '#C6C6C6',
		legendBg: '#ffffff',
		legendBorder: '#F1F0ED',
		legendTextColour: '#C6C6C6',
		tooltipBg: '#ffffff',
		tooltipDateBg: 'rgba(255, 255, 255, 0.8)',
		tooltipTextColour: '#C6C6C6',
		crosshairColour: '#C7452399',
		chartBg: 'transparent'
	}
};

/** @param {string} str */
function camelToKebab(str) {
	return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

export default class PlotChartTheme {
	/** @type {PlotThemeId} */
	selectedTheme = $state('terminal');

	/** @type {PlotThemeTokens} */
	tokens = $derived(THEME_PRESETS[this.selectedTheme]);

	plotStyle = $derived({
		fontFamily: this.tokens.fontFamily,
		fontSize: this.tokens.fontSize,
		background: this.tokens.chartBg,
		overflow: 'visible'
	});

	cssVars = $derived(
		Object.entries(this.tokens)
			.map(([key, value]) => `--plot-${camelToKebab(key)}: ${value}`)
			.join('; ')
	);

	/** @param {PlotThemeId} [initialTheme] */
	constructor(initialTheme = 'terminal') {
		this.selectedTheme = initialTheme;
	}

	/** @param {PlotThemeId} id */
	setTheme(id) {
		this.selectedTheme = id;
	}

	toggle() {
		this.selectedTheme = this.selectedTheme === 'terminal' ? 'openelectricity' : 'terminal';
	}
}
