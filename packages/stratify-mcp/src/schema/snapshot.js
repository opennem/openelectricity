/**
 * Default values for a StratifyPlotSnapshot.
 * Used when creating a new chart config.
 */
export const SNAPSHOT_DEFAULTS = {
	version: 2,
	csvText: '',
	title: '',
	description: '',
	dataSource: '',
	notes: '',
	chartType: 'line',
	displayMode: 'auto',
	stylePreset: 'sans',
	colourPalette: 'oe-energy',
	hiddenSeries: [],
	userSeriesColours: {},
	userSeriesLabels: {},
	seriesChartTypes: {},
	plotOverrides: null,
	seriesOrder: [],
	chartHeight: 400,
	showXTickLabels: true,
	xTicks: 0,
	xTickRotate: 0,
	marginBottom: 0,
	marginLeft: 0,
	yTicks: 0,
	yMinMax: false,
	y2Ticks: 0,
	y2MinMax: false,
	tooltipColumns: [],
	dataTransform: 'none',
	categorySort: 'default',
	xColumn: '',
	colourSeries: null,
	xLabel: '',
	yLabel: '',
	seriesYAxis: {},
	y2Label: '',
	showBranding: true
};

/**
 * Build a complete snapshot by merging user options over defaults.
 * @param {Record<string, any>} options
 * @returns {Record<string, any>}
 */
export function buildSnapshot(options) {
	return { ...SNAPSHOT_DEFAULTS, ...options };
}

/**
 * Validate a chart config and return errors.
 * @param {Record<string, any>} config
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateSnapshot(config) {
	const errors = [];
	const warnings = [];

	if (!config.csvText || typeof config.csvText !== 'string' || !config.csvText.trim()) {
		errors.push('csvText is required and must be non-empty');
	} else {
		const lines = config.csvText.trim().split('\n');
		if (lines.length < 2) {
			errors.push('CSV must have at least a header row and one data row');
		}
		const firstLine = lines[0] || '';
		const delim = firstLine.includes('\t') ? '\t' : firstLine.includes(',') ? ',' : ';';
		const cols = firstLine.split(delim);
		if (cols.length < 2) {
			errors.push('CSV must have at least 2 columns (x-axis + one data series)');
		}
	}

	const validChartTypes = [
		'line', 'area', 'column', 'column-stacked', 'column-grouped',
		'bar', 'bar-stacked', 'bar-grouped'
	];
	if (config.chartType && !validChartTypes.includes(config.chartType)) {
		errors.push(`Invalid chartType "${config.chartType}". Valid: ${validChartTypes.join(', ')}`);
	}

	const validModes = ['auto', 'time-series', 'category', 'linear'];
	if (config.displayMode && !validModes.includes(config.displayMode)) {
		errors.push(`Invalid displayMode "${config.displayMode}". Valid: ${validModes.join(', ')}`);
	}

	const validTransforms = ['none', 'cumulative'];
	if (config.dataTransform && !validTransforms.includes(config.dataTransform)) {
		errors.push(`Invalid dataTransform "${config.dataTransform}". Valid: ${validTransforms.join(', ')}`);
	}

	if (config.chartHeight != null && (config.chartHeight < 100 || config.chartHeight > 1200)) {
		warnings.push('chartHeight should be between 100 and 1200 pixels');
	}

	if (config.xTickRotate != null && (config.xTickRotate < -90 || config.xTickRotate > 90)) {
		warnings.push('xTickRotate should be between -90 and 90 degrees');
	}

	return { valid: errors.length === 0, errors, warnings };
}
