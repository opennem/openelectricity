/**
 * Observable Plot configuration factories for each chart type.
 *
 * Each function takes parsed CSV data (from csv-parser.js) and returns
 * a PlotOptions object ready to pass to PlotChart.
 */
import {
	areaY,
	lineY,
	barX,
	barY,
	rectY,
	dot,
	ruleX,
	ruleY,
	stackX,
	stackY,
	groupX,
	groupY
} from '@observablehq/plot';

/**
 * Per-series mark type for mixed charts.
 * @typedef {'area' | 'line' | 'bar' | 'dot'} SeriesMarkType
 */

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
/**
 * Detect the median time gap between date rows in milliseconds.
 * @param {Array<Record<string, any>>} data - Rows with a `date` field
 * @returns {number} Median gap in ms (defaults to 7 days)
 */
function detectMedianGapMs(data) {
	if (data.length < 2) return 7 * 86400000;
	const gaps = [];
	for (let i = 1; i < data.length; i++) {
		const a = data[i - 1].date?.getTime?.();
		const b = data[i].date?.getTime?.();
		if (a != null && b != null) gaps.push(b - a);
	}
	if (gaps.length === 0) return 7 * 86400000;
	gaps.sort((a, b) => a - b);
	return gaps[Math.floor(gaps.length / 2)];
}

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

	const isCategory = data.length > 0 && 'category' in data[0];
	const xKey = isCategory ? 'category' : 'date';
	const long = toLong(data, seriesNames, xKey);

	/** @type {any[]} */
	const marks = [...extraMarks];

	if (isCategory) {
		marks.push(
			barY(
				long,
				stackY(groupX({ y: 'sum' }, { x: 'x', y: 'value', fill: 'series', order: seriesNames }))
			)
		);
	} else {
		const halfGap = detectMedianGapMs(data) * 0.4;
		marks.push(
			rectY(
				long,
				stackY({
					x1: (/** @type {any} */ d) => new Date(d.x.getTime() - halfGap),
					x2: (/** @type {any} */ d) => new Date(d.x.getTime() + halfGap),
					y: 'value',
					fill: 'series',
					order: seriesNames
				})
			)
		);
	}

	marks.push(ruleY([0]));

	return {
		style,
		...(marginRight !== undefined ? { marginRight } : {}),
		color: { ...colourScale(seriesNames, colours, labels), legend },
		x: {
			label: null,
			...(isCategory ? { tickPadding: 6, type: 'band' } : { type: 'utc' })
		},
		y: { label: null, grid: true, tickFormat: yTickFormat },
		marks
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

	const isCategory = data.length > 0 && 'category' in data[0];
	const xKey = isCategory ? 'category' : 'date';
	const long = toLong(data, seriesNames, xKey);

	return {
		style,
		...(marginRight !== undefined ? { marginRight } : {}),
		color: { ...colourScale(seriesNames, colours, labels), legend },
		x: {
			label: null,
			...(isCategory ? { tickPadding: 6, tickRotate: -30, type: 'band' } : {})
		},
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

// ── Horizontal Bar Charts ──────────────────────────────────────

/**
 * Horizontal stacked bar chart.
 * @param {Array<Record<string, any>>} data
 * @param {string[]} seriesNames
 * @param {Record<string, string>} colours
 * @param {Record<string, string>} labels
 * @param {BarChartOptions} [options]
 * @returns {import('@observablehq/plot').PlotOptions}
 */
export function createHorizontalBarOptions(data, seriesNames, colours, labels, options = {}) {
	const {
		style = SHARED_STYLE,
		marginLeft,
		marginRight,
		legend = true,
		extraMarks = [],
		yTickFormat
	} = options;
	const long = toLong(data, seriesNames, 'category');

	// Auto-compute left margin from longest category label
	const maxLabelLen = data.reduce(
		(max, row) => Math.max(max, String(row.category ?? '').length),
		0
	);
	const autoMarginLeft = marginLeft ?? Math.min(Math.max(maxLabelLen * 6.5, 60), 200);

	return {
		style,
		marginLeft: autoMarginLeft,
		...(marginRight !== undefined ? { marginRight } : {}),
		color: { ...colourScale(seriesNames, colours, labels), legend },
		y: { label: null, tickPadding: 6, type: 'band', padding: 0.15 },
		x: { label: null, grid: true, zero: true, ...(yTickFormat ? { tickFormat: yTickFormat } : {}) },
		marks: [
			...extraMarks,
			barX(
				long,
				stackX(groupY({ x: 'sum' }, { y: 'x', x: 'value', fill: 'series', order: seriesNames }))
			),
			ruleX([0])
		]
	};
}

/**
 * Horizontal grouped bar chart.
 * @param {Array<Record<string, any>>} data
 * @param {string[]} seriesNames
 * @param {Record<string, string>} colours
 * @param {Record<string, string>} labels
 * @param {BarChartOptions} [options]
 * @returns {import('@observablehq/plot').PlotOptions}
 */
export function createGroupedHorizontalBarOptions(data, seriesNames, colours, labels, options = {}) {
	const {
		style = SHARED_STYLE,
		marginLeft,
		marginRight,
		legend = true,
		extraMarks = [],
		yTickFormat
	} = options;
	const long = toLong(data, seriesNames, 'category');

	const maxLabelLen = data.reduce(
		(max, row) => Math.max(max, String(row.category ?? '').length),
		0
	);
	const autoMarginLeft = marginLeft ?? Math.min(Math.max(maxLabelLen * 6.5, 60), 200);

	return {
		style,
		marginLeft: autoMarginLeft,
		...(marginRight !== undefined ? { marginRight } : {}),
		color: { ...colourScale(seriesNames, colours, labels), legend },
		y: { label: null, tickPadding: 6, type: 'band', padding: 0.15 },
		x: { label: null, grid: true, zero: true, ...(yTickFormat ? { tickFormat: yTickFormat } : {}) },
		fy: { label: null, padding: 0.2 },
		marks: [
			...extraMarks,
			barX(long, {
				y: 'series',
				x: 'value',
				fy: 'x',
				fill: 'series'
			}),
			ruleX([0])
		]
	};
}

// ── Colour-Grouped Bar Chart ────────────────────────────────────

/**
 * Bar chart where each bar is coloured by a categorical text column
 * (e.g. Market: NEM/WEM) rather than by the series name.
 * @param {Array<Record<string, any>>} data - Parsed rows with `category` field
 * @param {string} valueKey - Column key for Y values (e.g. 'capacity_factor')
 * @param {string[]} colourGroupNames - Unique colour group values (e.g. ['NEM', 'WEM'])
 * @param {Record<string, string>} colours - Map of group name → colour
 * @param {Record<string, string>} labels - Map of group name → display label
 * @param {string} colourSeriesKey - Column key containing group values (e.g. 'market')
 * @param {BarChartOptions} [options]
 * @returns {import('@observablehq/plot').PlotOptions}
 */
export function createColourGroupedBarOptions(
	data,
	valueKey,
	colourGroupNames,
	colours,
	labels,
	colourSeriesKey,
	options = {}
) {
	const {
		style = SHARED_STYLE,
		marginLeft,
		marginRight,
		legend = true,
		extraMarks = [],
		yTickFormat,
		horizontal = false
	} = options;

	const long = data
		.filter((row) => row[valueKey] != null)
		.map((row) => ({
			x: row.category,
			value: row[valueKey],
			colourGroup: row[colourSeriesKey] ?? 'Unknown'
		}));

	const colorScale = {
		domain: colourGroupNames,
		range: colourGroupNames.map((g) => colours[g]),
		legend,
		tickFormat: (/** @type {string} */ d) => labels[d] || d
	};

	if (horizontal) {
		const maxLabelLen = data.reduce(
			(max, row) => Math.max(max, String(row.category ?? '').length),
			0
		);
		const autoMarginLeft = marginLeft ?? Math.min(Math.max(maxLabelLen * 6.5, 60), 200);
		return {
			style,
			marginLeft: autoMarginLeft,
			...(marginRight !== undefined ? { marginRight } : {}),
			color: colorScale,
			y: { label: null, tickPadding: 6, type: 'band', padding: 0.15 },
			x: { label: null, grid: true, zero: true, ...(yTickFormat ? { tickFormat: yTickFormat } : {}) },
			marks: [
				...extraMarks,
				barX(long, { y: 'x', x: 'value', fill: 'colourGroup', sort: { y: '-x' } }),
				ruleX([0])
			]
		};
	}

	return {
		style,
		...(marginRight !== undefined ? { marginRight } : {}),
		color: colorScale,
		x: { label: null, tickPadding: 6, type: 'band' },
		y: { label: null, grid: true, ...(yTickFormat ? { tickFormat: yTickFormat } : {}) },
		marks: [
			...extraMarks,
			barY(long, { x: 'x', y: 'value', fill: 'colourGroup', sort: { x: '-y' } }),
			ruleY([0])
		]
	};
}

// ── Dot Chart ───────────────────────────────────────────────────

/**
 * Dot (scatter) chart for time-series data.
 * @param {Array<Record<string, any>>} data - Parsed rows with `date` field
 * @param {string[]} seriesNames
 * @param {Record<string, string>} colours
 * @param {Record<string, string>} labels
 * @param {TimeSeriesOptions} [options]
 * @returns {import('@observablehq/plot').PlotOptions}
 */
export function createDotOptions(data, seriesNames, colours, labels, options = {}) {
	const {
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
			dot(long, {
				x: 'x',
				y: 'value',
				stroke: 'series',
				fill: 'series',
				fillOpacity: 0.6,
				r: 3
			}),
			ruleY([0])
		]
	};
}

// ── Mixed Chart Type Support ────────────────────────────────────

/**
 * Map a global chart type to its default per-series mark type.
 * @param {string} chartType - Global chart type value
 * @returns {SeriesMarkType}
 */
export function globalTypeToMarkType(chartType) {
	switch (chartType) {
		case 'stacked-area':
		case 'area':
			return 'area';
		case 'bar-stacked':
		case 'grouped-bar':
			return 'bar';
		case 'dot':
			return 'dot';
		case 'line':
		default:
			return 'line';
	}
}

/**
 * Create Plot options with per-series chart type overrides.
 *
 * Partitions series by their effective mark type and creates the appropriate
 * Observable Plot marks for each group. Area series are stacked together,
 * bar series are grouped, and line/dot series are overlaid.
 *
 * @param {Array<Record<string, any>>} data
 * @param {string[]} seriesNames
 * @param {Record<string, string>} colours
 * @param {Record<string, string>} labels
 * @param {Record<string, SeriesMarkType>} seriesChartTypes - Per-series type overrides
 * @param {string} defaultChartType - Global chart type (fallback)
 * @param {TimeSeriesOptions} [options]
 * @returns {import('@observablehq/plot').PlotOptions}
 */
export function createMixedMarkOptions(
	data,
	seriesNames,
	colours,
	labels,
	seriesChartTypes,
	defaultChartType,
	options = {}
) {
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

	const defaultMarkType = globalTypeToMarkType(defaultChartType);

	// Detect whether data is time-series or category
	const isCategory = data.length > 0 && 'category' in data[0];
	const xKey = isCategory ? 'category' : 'date';

	// Partition series by effective mark type
	/** @type {Record<SeriesMarkType, string[]>} */
	const groups = { area: [], line: [], bar: [], dot: [] };
	for (const name of seriesNames) {
		const markType = seriesChartTypes[name] || defaultMarkType;
		groups[markType].push(name);
	}

	// Build marks for each group
	/** @type {any[]} */
	const marks = [];

	if (gridlines) marks.push(...gridlines.gridlineMarks);
	marks.push(...extraMarks);

	// Area series (stacked together)
	if (groups.area.length > 0) {
		const long = toLong(data, groups.area, xKey);
		marks.push(
			areaY(
				long,
				stackY({
					x: 'x',
					y: 'value',
					fill: 'series',
					...(curve ? { curve } : {}),
					order: groups.area
				})
			)
		);
	}

	// Bar series
	if (groups.bar.length > 0) {
		const long = toLong(data, groups.bar, xKey);
		if (isCategory) {
			marks.push(
				barY(
					long,
					stackY(groupX({ y: 'sum' }, { x: 'x', y: 'value', fill: 'series', order: groups.bar }))
				)
			);
		} else {
			const halfGap = detectMedianGapMs(data) * 0.4;
			marks.push(
				rectY(
					long,
					stackY({
						x1: (/** @type {any} */ d) => new Date(d.x.getTime() - halfGap),
						x2: (/** @type {any} */ d) => new Date(d.x.getTime() + halfGap),
						y: 'value',
						fill: 'series',
						order: groups.bar
					})
				)
			);
		}
	}

	// Line series (overlaid)
	if (groups.line.length > 0) {
		const long = toLong(data, groups.line, xKey);
		marks.push(
			lineY(long, {
				x: 'x',
				y: 'value',
				stroke: 'series',
				strokeWidth: 1.5,
				...(curve ? { curve } : {})
			})
		);
	}

	// Dot series (overlaid)
	if (groups.dot.length > 0) {
		const long = toLong(data, groups.dot, xKey);
		marks.push(
			dot(long, {
				x: 'x',
				y: 'value',
				stroke: 'series',
				fill: 'series',
				fillOpacity: 0.6,
				r: 3
			})
		);
	}

	marks.push(ruleY([0]));

	return {
		style,
		...(marginLeft !== undefined ? { marginLeft } : {}),
		...(marginRight !== undefined ? { marginRight } : {}),
		color: { ...colourScale(seriesNames, colours, labels), legend },
		x: {
			label: null,
			...(xDomain ? { domain: xDomain } : {}),
			...(xType ? { type: /** @type {any} */ (xType) } : {}),
			...(isCategory ? { tickPadding: 6, type: 'band' } : {}),
			...(gridlines ? { axis: null } : {})
		},
		y: {
			label: null,
			grid: !gridlines,
			...(yTickFormat ? { tickFormat: yTickFormat } : {}),
			...(yDomain ? { domain: yDomain } : {})
		},
		marks
	};
}

// ── Tooltip Channels ────────────────────────────────────────────

/**
 * Build tooltip channels map from label lookups, disambiguating duplicate labels.
 *
 * Observable Plot tip() uses the channel keys as display text. Since we invert
 * {dataKey → label} to {label → dataKey}, duplicate labels would silently
 * overwrite each other. This function appends the data key in parentheses
 * when labels collide.
 *
 * @param {Record<string, string>} tooltipLabels - Map of data key → display label
 * @returns {Record<string, string>} Map of display label → data key
 */
export function buildTooltipChannels(tooltipLabels) {
	const labelCounts = /** @type {Record<string, number>} */ ({});
	for (const label of Object.values(tooltipLabels)) {
		labelCounts[label] = (labelCounts[label] || 0) + 1;
	}

	return Object.fromEntries(
		Object.entries(tooltipLabels).map(([key, label]) => {
			const displayLabel = labelCounts[label] > 1 ? `${label} (${key})` : label;
			return [displayLabel, key];
		})
	);
}
