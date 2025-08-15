/** @typedef {{
 * key: symbol,
 * title: string,
 * prefix: SiPrefix,
 * baseUnit: string,
 * displayPrefix: SiPrefix,
 * allowedPrefixes: SiPrefix[],
 * chartType?: string,
 * hideDataOptions?: boolean,
 * hideChartTypeOptions?: boolean,
 * chartStyles?: { chartHeightClasses: string, chartPadding?: Object, xAxisYTick?: number, xTextClasses?: string }
 * }} chartCxtOptions */

/** @type {Record<string, chartCxtOptions>} */
export let chartCxtsOptions = {
	'generation-trends-chart': {
		key: Symbol('generation-trends-chart'),
		title: 'Generation Trends',
		prefix: 'M',
		displayPrefix: 'G',
		allowedPrefixes: ['M', 'G', 'T'],
		baseUnit: 'Wh',
		chartType: 'line', // Default to line chart
		hideDataOptions: true, // Hide data transform options
		hideChartTypeOptions: true, // Hide chart type options
		chartStyles: {
			chartHeightClasses: 'h-[300px] md:h-[350px]',
			chartPadding: { top: 20, right: 0, bottom: 20, left: 0 },
			xAxisYTick: 20, // Increase y position of x-axis labels
			xTextClasses: 'text-xs font-light text-gray-600' // Ensure labels are visible
		}
	},
	'combined-generation-trends': {
		key: Symbol('combined-generation-trends'),
		title: 'Monthly',
		prefix: 'M',
		displayPrefix: 'G',
		allowedPrefixes: ['M', 'G', 'T'],
		baseUnit: 'Wh',
		chartType: 'line', // Default to line chart
		hideDataOptions: true, // Hide data transform options
		hideChartTypeOptions: true, // Hide chart type options
		chartStyles: {
			chartHeightClasses: 'h-[400px] md:h-[450px]', // Slightly taller for combined chart
			chartPadding: { top: 20, right: 0, bottom: 20, left: 0 },
			xAxisYTick: 20, // Increase y position of x-axis labels
			xTextClasses: 'text-xs font-light text-gray-600' // Ensure labels are visible
		}
	},
	'cumulative-generation-trends': {
		key: Symbol('cumulative-generation-trends'),
		title: 'Year to date',
		prefix: 'M',
		displayPrefix: 'G',
		allowedPrefixes: ['M', 'G', 'T'],
		baseUnit: 'Wh',
		chartType: 'line', // Default to line chart
		hideDataOptions: true, // Hide data transform options
		hideChartTypeOptions: true, // Hide chart type options
		chartStyles: {
			chartHeightClasses: 'h-[400px] md:h-[450px]', // Slightly taller for cumulative chart
			chartPadding: { top: 20, right: 0, bottom: 20, left: 0 },
			xAxisYTick: 20, // Increase y position of x-axis labels
			xTextClasses: 'text-xs font-light text-gray-600' // Ensure labels are visible
		}
	}
};
