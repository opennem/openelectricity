/** @typedef {{
 * key: symbol,
 * title: string,
 * prefix: SiPrefix,
 * baseUnit: string,
 * displayPrefix: SiPrefix,
 * allowedPrefixes: SiPrefix[],
 * chartStyles?: { chartHeightClasses: string }
 * }} chartCxtOptions */

/** @type {Record<string, chartCxtOptions>} */
export let chartCxtsOptions = {
	'energy-chart': {
		key: Symbol('energy-chart'),
		title: 'Energy',
		prefix: 'T',
		displayPrefix: 'T',
		allowedPrefixes: ['M', 'G', 'T'],
		baseUnit: 'Wh',
		chartStyles: { chartHeightClasses: 'h-[400px] md:h-[450px]' }
	},
	'emissions-chart': {
		key: Symbol('emissions-chart'),
		title: 'Emissions',
		prefix: 'M',
		displayPrefix: 'M',
		allowedPrefixes: ['k', 'M', 'G'],
		baseUnit: 'tCO2e',
		chartStyles: { chartHeightClasses: 'h-[300px] md:h-[350px]' }
	}
};

/** @type {chartCxtOptions} */
export let dateBrushCxtOptions = {
	key: Symbol('date-brush'),
	title: 'Date Brush',
	prefix: 'M',
	displayPrefix: 'M',
	allowedPrefixes: ['M'],
	baseUnit: 'Wh'
};

/** @type {Record<string, {label: string, intervals?: string[]}>} */
export let rangeIntervalMap = {
	monthly: {
		label: 'Monthly',
		intervals: ['1M', '1Q', '6M', '1Y']
	},
	'12-month-rolling': {
		label: '12 mth rolling',
		intervals: ['1M', '1Q', '6M']
	},
	yearly: {
		label: 'Yearly'
	}
};
