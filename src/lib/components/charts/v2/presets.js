/**
 * Chart Presets
 *
 * Pre-configured settings for common chart types in the application.
 * Use these to quickly set up charts with sensible defaults.
 */

/**
 * @typedef {Object} ChartPreset
 * @property {string} baseUnit - Base unit for the data
 * @property {SiPrefix} prefix - SI prefix for the data
 * @property {SiPrefix} displayPrefix - SI prefix for display
 * @property {SiPrefix[]} allowedPrefixes - Allowed prefixes for user switching
 * @property {'stacked-area' | 'area' | 'line'} chartType - Default chart type
 * @property {string} [timeZone] - Default timezone
 */

/**
 * Power chart preset (MW/GW)
 * Used for instantaneous power readings
 * @type {ChartPreset}
 */
export const powerChartPreset = {
	baseUnit: 'W',
	prefix: 'M',
	displayPrefix: 'M',
	allowedPrefixes: ['M', 'G'],
	chartType: 'stacked-area',
	timeZone: 'Australia/Sydney'
};

/**
 * Energy chart preset (GWh/TWh)
 * Used for cumulative energy measurements
 * @type {ChartPreset}
 */
export const energyChartPreset = {
	baseUnit: 'Wh',
	prefix: 'G',
	displayPrefix: 'G',
	allowedPrefixes: ['G', 'T'],
	chartType: 'stacked-area',
	timeZone: 'Australia/Sydney'
};

/**
 * Emissions chart preset (tonnes)
 * Used for CO2 emissions data
 * @type {ChartPreset}
 */
export const emissionsChartPreset = {
	baseUnit: 't',
	prefix: 'k',
	displayPrefix: 'k',
	allowedPrefixes: ['k', 'M'],
	chartType: 'stacked-area',
	timeZone: 'Australia/Sydney'
};

/**
 * Intensity chart preset (g/kWh or kg/MWh)
 * Used for emissions intensity
 * @type {ChartPreset}
 */
export const intensityChartPreset = {
	baseUnit: 'g/kWh',
	prefix: '',
	displayPrefix: '',
	allowedPrefixes: [],
	chartType: 'line',
	timeZone: 'Australia/Sydney'
};

/**
 * Price chart preset ($/MWh)
 * Used for electricity spot prices
 * @type {ChartPreset}
 */
export const priceChartPreset = {
	baseUnit: '$/MWh',
	prefix: '',
	displayPrefix: '',
	allowedPrefixes: [],
	chartType: 'line',
	timeZone: 'Australia/Sydney'
};

/**
 * Temperature chart preset (°C)
 * @type {ChartPreset}
 */
export const temperatureChartPreset = {
	baseUnit: '°C',
	prefix: '',
	displayPrefix: '',
	allowedPrefixes: [],
	chartType: 'line',
	timeZone: 'Australia/Sydney'
};

/**
 * Percentage chart preset (%)
 * Used for capacity factors, proportions, etc.
 * @type {ChartPreset}
 */
export const percentageChartPreset = {
	baseUnit: '%',
	prefix: '',
	displayPrefix: '',
	allowedPrefixes: [],
	chartType: 'stacked-area',
	timeZone: 'Australia/Sydney'
};

/**
 * Create a custom preset by merging with defaults
 * @param {Partial<ChartPreset>} overrides
 * @returns {ChartPreset}
 */
export function createPreset(overrides) {
	return {
		baseUnit: '',
		prefix: '',
		displayPrefix: '',
		allowedPrefixes: [],
		chartType: 'stacked-area',
		timeZone: 'Australia/Sydney',
		...overrides
	};
}

/**
 * Apply a preset to chart config
 * @param {ChartPreset} preset
 * @param {Object} [additionalConfig]
 * @returns {Object}
 */
export function applyPreset(preset, additionalConfig = {}) {
	return {
		baseUnit: preset.baseUnit,
		prefix: preset.prefix,
		displayPrefix: preset.displayPrefix,
		allowedPrefixes: preset.allowedPrefixes,
		chartType: preset.chartType,
		timeZone: preset.timeZone,
		...additionalConfig
	};
}
