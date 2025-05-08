/** @typedef {{
 * key: symbol,
 * title: string,
 * prefix: SiPrefix,
 * baseUnit: string,
 * displayPrefix: SiPrefix,
 * allowedPrefixes: SiPrefix[],
 * chartStyles?: { chartHeightClasses: string, xAxisFill: string, showLastYTick: boolean, chartPadding: { top: number, right: number, bottom: number, left: number } }
 * }} chartCxtOptions */

/** @type {Record<string, chartCxtOptions>} */
export let chartCxtsOptions = {
	'power-energy-chart': {
		key: Symbol('power-energy-chart'),
		title: 'Generation',
		prefix: 'M',
		displayPrefix: 'M',
		allowedPrefixes: ['M', 'G'],
		baseUnit: 'W',
		chartStyles: {
			chartHeightClasses: 'h-[230px]',
			chartPadding: { top: 0, right: 0, bottom: 40, left: 0 },
			xAxisFill: 'rgb(250, 249, 246)',
			showLastYTick: false
		}
	}
};

/** @type {Record<string, {label: string, intervals?: string[]}>} */
export let rangeIntervalMap = {
	'7d': {
		label: '7d',
		intervals: ['5m', '30m']
	}
	// monthly: {
	// 	label: 'Monthly',
	// 	intervals: ['1M', '1Q', '6M', '1Y']
	// },
	// '12-month-rolling': {
	// 	label: '12 mth rolling',
	// 	intervals: ['1M', '1Q', '6M']
	// },
	// yearly: {
	// 	label: 'Yearly'
	// }
};
