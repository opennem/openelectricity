/**
 * Observable Plot configuration factories for each chart type.
 *
 * Each function takes parsed CSV data (from csv-parser.js) and returns
 * a PlotOptions object ready to pass to PlotChart.
 */
import { areaY, lineY, barY, ruleX, ruleY, stackY, groupX } from '@observablehq/plot';

const SHARED_STYLE = {
	fontFamily: 'DM Mono, monospace',
	fontSize: '10px',
	background: 'transparent',
	overflow: 'visible'
};

/**
 * Pivot wide-format data to long-format for Observable Plot's stacked marks.
 * @param {Array<Record<string, any>>} data
 * @param {string[]} seriesNames
 * @param {string} xKey - 'date' for time-series, 'category' for category
 * @returns {Array<{x: any, series: string, value: number}>}
 */
export function toLong(data, seriesNames, xKey) {
	return data.flatMap((row) =>
		seriesNames
			.filter((name) => row[name] != null)
			.map((name) => ({
				x: row[xKey],
				series: name,
				value: row[name]
			}))
	);
}

/**
 * Build a colour scale config from series names and colours.
 * @param {string[]} seriesNames
 * @param {Record<string, string>} colours
 * @param {Record<string, string>} labels
 */
export function colourScale(seriesNames, colours, labels) {
	return {
		domain: seriesNames,
		range: seriesNames.map((s) => colours[s]),
		legend: true,
		tickFormat: (/** @type {string} */ d) => labels[d] || d
	};
}

// ── Overlay Marks ────────────────────────────────────────────────

/**
 * Create capacity reference line marks.
 * @param {{ positive: number, negative: number }} capacitySums
 * @param {{ isLine: boolean, isEnergyMetric: boolean }} options
 * @returns {any[]}
 */
export function capacityMarks(capacitySums, { isLine, isEnergyMetric }) {
	if (isEnergyMetric) return [];

	const marks = [];
	if (isLine) {
		const max = Math.max(capacitySums.positive, capacitySums.negative);
		if (max > 0) {
			marks.push(
				ruleY([max], {
					stroke: '#888',
					strokeDasharray: '4,3',
					strokeWidth: 1
				})
			);
		}
	} else {
		if (capacitySums.positive > 0) {
			marks.push(
				ruleY([capacitySums.positive], {
					stroke: '#888',
					strokeDasharray: '4,3',
					strokeWidth: 1
				})
			);
		}
		if (capacitySums.negative > 0) {
			marks.push(
				ruleY([-capacitySums.negative], {
					stroke: '#888',
					strokeDasharray: '4,3',
					strokeWidth: 1
				})
			);
		}
	}
	return marks;
}

/**
 * Night shading is rendered as HTML overlay divs (not Plot marks) to avoid
 * interfering with Plot's y-domain calculation. See the page component for
 * the overlay rendering using timeToPx().
 */

// ── Chart Config Factories ───────────────────────────────────────

/**
 * @typedef {Object} TimeSeriesOptions
 * @property {string} [curve]
 * @property {[Date, Date]} [xDomain]
 * @property {object} [style]
 * @property {number} [marginLeft]
 * @property {number} [marginRight]
 * @property {boolean} [legend]
 * @property {string} [xType]
 * @property {any[]} [extraMarks] - Additional marks (capacity lines, night shading, etc.)
 * @property {{ ticks: Date[], tickFormat: (d: any) => string, gridlineMarks: any[] }} [gridlines]
 * @property {[number, number]} [yDomain] - Explicit y-domain (e.g. extended for capacity lines)
 * @property {string | ((d: number) => string)} [yTickFormat] - Custom y-axis tick format (default: 's')
 */

/**
 * Stacked area chart for time-series data.
 * @param {Array<Record<string, any>>} data - Parsed rows with `date` field
 * @param {string[]} seriesNames
 * @param {Record<string, string>} colours
 * @param {Record<string, string>} labels
 * @param {TimeSeriesOptions} [options]
 * @returns {import('@observablehq/plot').PlotOptions}
 */
export function createStackedAreaOptions(data, seriesNames, colours, labels, options = {}) {
	const {
		curve,
		xDomain,
		style = SHARED_STYLE,
		marginLeft,
		marginRight,
		legend = true,
		xType,
		extraMarks = [],
		gridlines,
		yDomain,
		yTickFormat = 's'
	} = options;
	const long = toLong(data, seriesNames, 'date');

	return {
		style,
		...(marginLeft !== undefined ? { marginLeft } : {}),
		...(marginRight !== undefined ? { marginRight } : {}),
		color: { ...colourScale(seriesNames, colours, labels), legend },
		x: {
			label: null,
			...(xDomain ? { domain: xDomain } : {}),
			...(xType ? { type: /** @type {any} */ (xType) } : {}),
			...(gridlines ? { axis: null } : {})
		},
		y: {
			label: null,
			grid: !gridlines,
			tickFormat: yTickFormat,
			...(yDomain ? { domain: yDomain } : {})
		},
		marks: [
			...(gridlines ? gridlines.gridlineMarks : []),
			...extraMarks,
			areaY(
				long,
				stackY({
					x: 'x',
					y: 'value',
					fill: 'series',
					...(curve ? { curve } : {}),
					order: seriesNames
				})
			),
			ruleY([0])
		]
	};
}

/**
 * Multi-series line chart for time-series data.
 * @param {Array<Record<string, any>>} data - Parsed rows with `date` field
 * @param {string[]} seriesNames
 * @param {Record<string, string>} colours
 * @param {Record<string, string>} labels
 * @param {TimeSeriesOptions} [options]
 * @returns {import('@observablehq/plot').PlotOptions}
 */
export function createLineOptions(data, seriesNames, colours, labels, options = {}) {
	const {
		curve,
		xDomain,
		style = SHARED_STYLE,
		marginLeft,
		marginRight,
		legend = true,
		xType,
		extraMarks = [],
		gridlines,
		yDomain,
		yTickFormat
	} = options;
	const long = toLong(data, seriesNames, 'date');

	return {
		style,
		...(marginLeft !== undefined ? { marginLeft } : {}),
		...(marginRight !== undefined ? { marginRight } : {}),
		color: { ...colourScale(seriesNames, colours, labels), legend },
		x: {
			label: null,
			...(xDomain ? { domain: xDomain } : {}),
			...(xType ? { type: /** @type {any} */ (xType) } : {}),
			...(gridlines ? { axis: null } : {})
		},
		y: {
			label: null,
			grid: !gridlines,
			...(yTickFormat ? { tickFormat: yTickFormat } : {}),
			...(yDomain ? { domain: yDomain } : {})
		},
		marks: [
			...(gridlines ? gridlines.gridlineMarks : []),
			...extraMarks,
			lineY(long, {
				x: 'x',
				y: 'value',
				stroke: 'series',
				strokeWidth: 1.5,
				...(curve ? { curve } : {})
			}),
			ruleY([0])
		]
	};
}

/**
 * @typedef {Object} BarChartOptions
 * @property {object} [style]
 * @property {number} [marginRight]
 * @property {boolean} [legend]
 * @property {any[]} [extraMarks] - Additional marks
 * @property {string | ((d: number) => string)} [yTickFormat]
 */

/**
 * Stacked bar chart for category data.
 * @param {Array<Record<string, any>>} data - Parsed rows with `category` field
 * @param {string[]} seriesNames
 * @param {Record<string, string>} colours
 * @param {Record<string, string>} labels
 * @param {BarChartOptions} [options]
 * @returns {import('@observablehq/plot').PlotOptions}
 */
export function createStackedBarOptions(data, seriesNames, colours, labels, options = {}) {
	const {
		style = SHARED_STYLE,
		marginRight,
		legend = true,
		extraMarks = [],
		yTickFormat = 's'
	} = options;
	const long = toLong(data, seriesNames, 'category');

	return {
		style,
		...(marginRight !== undefined ? { marginRight } : {}),
		color: { ...colourScale(seriesNames, colours, labels), legend },
		x: { label: null, tickPadding: 6, type: 'band' },
		y: { label: null, grid: true, tickFormat: yTickFormat },
		marks: [
			...extraMarks,
			barY(
				long,
				stackY(
					groupX(
						{ y: 'sum' },
						{
							x: 'x',
							y: 'value',
							fill: 'series',
							order: seriesNames
						}
					)
				)
			),
			ruleY([0])
		]
	};
}

/**
 * Grouped bar chart for category data.
 * @param {Array<Record<string, any>>} data - Parsed rows with `category` field
 * @param {string[]} seriesNames
 * @param {Record<string, string>} colours
 * @param {Record<string, string>} labels
 * @param {BarChartOptions} [options]
 * @returns {import('@observablehq/plot').PlotOptions}
 */
export function createGroupedBarOptions(data, seriesNames, colours, labels, options = {}) {
	const {
		style = SHARED_STYLE,
		marginRight,
		legend = true,
		extraMarks = [],
		yTickFormat
	} = options;
	const long = toLong(data, seriesNames, 'category');

	return {
		style,
		...(marginRight !== undefined ? { marginRight } : {}),
		color: { ...colourScale(seriesNames, colours, labels), legend },
		x: { label: null, tickPadding: 6, tickRotate: -30, type: 'band' },
		y: { label: null, grid: true, ...(yTickFormat ? { tickFormat: yTickFormat } : {}) },
		fx: { label: null, padding: 0.2 },
		marks: [
			...extraMarks,
			barY(long, {
				x: 'series',
				y: 'value',
				fx: 'x',
				fill: 'series'
			}),
			ruleY([0])
		]
	};
}
