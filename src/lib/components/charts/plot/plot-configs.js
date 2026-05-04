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
	groupY,
	text
} from '@observablehq/plot';
import { getLineDasharray } from '$lib/stratify/chart-types.js';

/**
 * Per-series mark type for mixed charts.
 * @typedef {'area' | 'line' | 'bar' | 'dot'} SeriesMarkType
 */

/**
 * Compute left margin based on the longest category label.
 * @param {Array<{category?: string}>} data
 * @param {number} [marginLeft]
 * @returns {number}
 */
function computeAutoMarginLeft(data, marginLeft) {
	if (marginLeft != null) return marginLeft;
	const maxLen = data.reduce((max, row) => Math.max(max, String(row.category ?? '').length), 0);
	return Math.min(Math.max(maxLen * 6.5, 60), 200);
}

/**
 * Detect the x-axis key and mode from data rows.
 * @param {Array<Record<string, any>>} data
 * @returns {{ xKey: string, isCategory: boolean, isLinear: boolean }}
 */
export function detectXMode(data) {
	if (data.length === 0) return { xKey: 'date', isCategory: false, isLinear: false };
	if ('category' in data[0]) return { xKey: 'category', isCategory: true, isLinear: false };
	if ('linear' in data[0]) return { xKey: 'linear', isCategory: false, isLinear: true };
	return { xKey: 'date', isCategory: false, isLinear: false };
}

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
	const isLinear = 'linear' in (data[0] || {});
	const gaps = [];
	for (let i = 1; i < data.length; i++) {
		const a = isLinear ? data[i - 1].linear : data[i - 1].date?.getTime?.();
		const b = isLinear ? data[i].linear : data[i].date?.getTime?.();
		if (a != null && b != null) gaps.push(b - a);
	}
	if (gaps.length === 0) return 7 * 86400000;
	gaps.sort((a, b) => a - b);
	return gaps[Math.floor(gaps.length / 2)];
}

/**
 * Field names used on long-format rows for Plot's facet channels.
 * `FACET_FIELD` carries the raw facet value (e.g. 'NSW'). `FACET_X_FIELD`
 * and `FACET_Y_FIELD` carry the synthetic grid indexes used when wrapping
 * panels into a 2-D layout. Exported so callers (e.g. tooltip suppression)
 * can refer to the same identifiers without duplicating the literals.
 */
export const FACET_FIELD = 'facet';
export const FACET_X_FIELD = '_fx';
export const FACET_Y_FIELD = '_fy';

/**
 * @typedef {Object} FacetGrid
 * @property {number} cols - Number of columns in the wrapped grid
 * @property {number} rows - Number of rows in the wrapped grid
 * @property {Map<any, { col: number, row: number }>} indexByFacet - Facet value → grid position
 */

/**
 * Pivot wide-format data to long-format for Observable Plot's stacked marks.
 * @param {Array<Record<string, any>>} data
 * @param {string[]} seriesNames
 * @param {string} xKey - 'date' for time-series, 'category' for category
 * @param {string | null} [facetKey] - Optional column key to include as `facet` on each row
 * @param {FacetGrid | null} [facetGrid] - Optional grid layout; adds `_fx`/`_fy` per row
 * @returns {Array<Record<string, any>>}
 */
export function toLong(data, seriesNames, xKey, facetKey = null, facetGrid = null) {
	return data.flatMap((row) =>
		seriesNames
			.filter((name) => row[name] != null)
			.map((name) => {
				/** @type {Record<string, any>} */
				const out = { x: row[xKey], series: name, value: row[name] };
				if (facetKey) {
					out[FACET_FIELD] = row[facetKey];
					if (facetGrid) {
						const pos = facetGrid.indexByFacet.get(row[facetKey]);
						if (pos) {
							out[FACET_X_FIELD] = pos.col;
							out[FACET_Y_FIELD] = pos.row;
						}
					}
				}
				return out;
			})
	);
}

/**
 * Build the facet grid layout map from an ordered list of facet values.
 * @param {any[]} facetValues - Unique facet values, in display order
 * @param {number} cols - Number of columns per row
 * @returns {FacetGrid}
 */
export function buildFacetGrid(facetValues, cols) {
	const safeCols = Math.max(1, cols);
	/** @type {Map<any, { col: number, row: number }>} */
	const indexByFacet = new Map();
	facetValues.forEach((v, i) => {
		indexByFacet.set(v, { col: i % safeCols, row: Math.floor(i / safeCols) });
	});
	return {
		cols: safeCols,
		rows: Math.ceil(facetValues.length / safeCols),
		indexByFacet
	};
}

/**
 * Mark-level facet spec. Single-row faceting uses `fx: 'facet'` (Plot
 * renders one auto-labelled panel per value). Grid faceting uses synthetic
 * `_fx`/`_fy` indexes so panels wrap into a 2-D grid.
 * @param {string | null} facetColumn
 * @param {FacetGrid | null} facetGrid
 */
function getFacetMarkSpec(facetColumn, facetGrid) {
	if (!facetColumn) return {};
	if (facetGrid) return { fx: FACET_X_FIELD, fy: FACET_Y_FIELD };
	return { fx: FACET_FIELD };
}

/**
 * Top-level fx/fy scale config for facets. Grid mode hides the auto axes
 * (synthetic indexes aren't meaningful labels — we render text marks instead).
 * @param {string | null} facetColumn
 * @param {FacetGrid | null} facetGrid
 */
function getFacetScales(facetColumn, facetGrid) {
	if (!facetColumn) return {};
	if (facetGrid) {
		// fy.padding leaves room for the per-panel label rendered above each row.
		return {
			fx: { axis: null, padding: 0.04 },
			fy: { axis: null, padding: 0.25 }
		};
	}
	return { fx: { label: null, padding: 0.05 } };
}

/**
 * Build a `text` mark that renders the facet name in the top-right of each
 * grid panel. Returns null when grid faceting is not active.
 * @param {string | null} facetColumn
 * @param {FacetGrid | null} facetGrid
 * @returns {any | null}
 */
function buildFacetLabelMark(facetColumn, facetGrid) {
	if (!facetColumn || !facetGrid) return null;
	/** @type {Array<Record<string, any>>} */
	const labelData = [];
	for (const [name, pos] of facetGrid.indexByFacet) {
		labelData.push({
			[FACET_X_FIELD]: pos.col,
			[FACET_Y_FIELD]: pos.row,
			label: String(name)
		});
	}
	return text(labelData, {
		fx: FACET_X_FIELD,
		fy: FACET_Y_FIELD,
		text: 'label',
		frameAnchor: 'top-right',
		// `lineAnchor: 'bottom'` + negative `dy` keeps the label entirely
		// above the panel frame instead of overlapping the data area.
		dx: -2,
		dy: -4,
		lineAnchor: 'bottom',
		fontWeight: 600,
		fontSize: 11
	});
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
 * @property {Record<string, string>} [seriesLineStyles] - Per-series line style overrides
 * @property {string | null} [facetColumn] - Column key to partition data into small-multiple panels (Plot fx)
 * @property {FacetGrid | null} [facetGrid] - Optional 2-D grid layout for wrapped small multiples
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
		yTickFormat = 's',
		facetColumn = null,
		facetGrid = null
	} = options;
	const { xKey, isLinear } = detectXMode(data);
	const long = toLong(data, seriesNames, xKey, facetColumn, facetGrid);
	const facetMark = getFacetMarkSpec(facetColumn, facetGrid);
	const labelMark = buildFacetLabelMark(facetColumn, facetGrid);

	return {
		style,
		...(marginLeft !== undefined ? { marginLeft } : {}),
		...(marginRight !== undefined ? { marginRight } : {}),
		color: { ...colourScale(seriesNames, colours, labels), legend },
		x: {
			label: null,
			...(xDomain ? { domain: xDomain } : {}),
			...(xType ? { type: /** @type {any} */ (xType) } : {}),
			...(isLinear ? { type: 'linear' } : {}),
			...(gridlines ? { axis: null } : {}),
		},
		y: {
			label: null,
			grid: !gridlines,
			tickFormat: yTickFormat,
			...(yDomain ? { domain: yDomain } : {}),
		},
		...getFacetScales(facetColumn, facetGrid),
		marks: [
			...(gridlines ? gridlines.gridlineMarks : []),
			...extraMarks,
			areaY(
				long,
				stackY({
					x: 'x',
					y: 'value',
					fill: 'series',
					...facetMark,
					...(curve ? { curve } : {}),
					order: seriesNames
				})
			),
			ruleY([0]),
			...(labelMark ? [labelMark] : [])
		]
	};
}

/**
 * Build lineY marks, grouping series by dash pattern when needed.
 * When all series are solid, returns a single mark (fast path).
 * @param {Array<Record<string, any>>} data
 * @param {string[]} seriesNames
 * @param {string} xKey
 * @param {Record<string, string>} seriesLineStyles
 * @param {string} [curve]
 * @param {string | null} [facetColumn]
 * @param {FacetGrid | null} [facetGrid]
 * @returns {any[]}
 */
function buildLineMarks(data, seriesNames, xKey, seriesLineStyles, curve, facetColumn = null, facetGrid = null) {
	const hasCustomStyles = seriesNames.some((n) => getLineDasharray(seriesLineStyles[n]) !== undefined);
	const facetMark = getFacetMarkSpec(facetColumn, facetGrid);

	if (!hasCustomStyles) {
		const long = toLong(data, seriesNames, xKey, facetColumn, facetGrid);
		return [
			lineY(long, {
				x: 'x',
				y: 'value',
				stroke: 'series',
				strokeWidth: 2,
				...facetMark,
				...(curve ? { curve } : {})
			})
		];
	}

	/** @type {Map<string, string[]>} dasharray key → series names */
	const groups = new Map();
	for (const name of seriesNames) {
		const dash = getLineDasharray(seriesLineStyles[name]) ?? '__solid__';
		if (!groups.has(dash)) groups.set(dash, []);
		groups.get(dash)?.push(name);
	}

	/** @type {any[]} */
	const marks = [];
	for (const [dash, groupNames] of groups) {
		const long = toLong(data, groupNames, xKey, facetColumn, facetGrid);
		marks.push(
			lineY(long, {
				x: 'x',
				y: 'value',
				stroke: 'series',
				strokeWidth: 2,
				...facetMark,
				...(curve ? { curve } : {}),
				...(dash !== '__solid__' ? { strokeDasharray: dash } : {})
			})
		);
	}
	return marks;
}

/**
 * Multi-series line chart for time-series or category data.
 * @param {Array<Record<string, any>>} data - Parsed rows with `date` or `category` field
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
		yTickFormat,
		seriesLineStyles = {},
		facetColumn = null,
		facetGrid = null
	} = options;
	const { xKey, isCategory, isLinear } = detectXMode(data);

	const lineMarks = buildLineMarks(data, seriesNames, xKey, seriesLineStyles, curve, facetColumn, facetGrid);
	const facetMark = getFacetMarkSpec(facetColumn, facetGrid);
	const labelMark = buildFacetLabelMark(facetColumn, facetGrid);

	return {
		style,
		...(marginLeft !== undefined ? { marginLeft } : {}),
		...(marginRight !== undefined ? { marginRight } : {}),
		color: { ...colourScale(seriesNames, colours, labels), legend },
		x: {
			label: null,
			...(xDomain ? { domain: xDomain } : {}),
			...(xType ? { type: /** @type {any} */ (xType) } : {}),
			...(isCategory ? { tickPadding: 6, type: 'point' } : {}),
			...(isLinear ? { type: 'linear' } : {}),
			...(gridlines ? { axis: null } : {}),
		},
		y: {
			label: null,
			grid: !gridlines,
			...(yTickFormat ? { tickFormat: yTickFormat } : {}),
			...(yDomain ? { domain: yDomain } : {}),
		},
		...getFacetScales(facetColumn, facetGrid),
		marks: [
			...(gridlines ? gridlines.gridlineMarks : []),
			...extraMarks,
			...lineMarks,
			ruleY([0]),
			...(labelMark ? [labelMark] : [])
		]
	};
}

/**
 * @typedef {Object} BarChartOptions
 * @property {object} [style]
 * @property {number} [marginLeft]
 * @property {number} [marginRight]
 * @property {boolean} [legend]
 * @property {any[]} [extraMarks] - Additional marks
 * @property {string | ((d: number) => string)} [yTickFormat]
 * @property {boolean} [horizontal]
 * @property {string | null} [facetColumn] - Column key to partition data into small-multiple panels (Plot fx)
 * @property {FacetGrid | null} [facetGrid] - Optional 2-D grid layout for wrapped small multiples
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
		yTickFormat = 's',
		facetColumn = null,
		facetGrid = null
	} = options;

	const { xKey, isCategory, isLinear } = detectXMode(data);
	const long = toLong(data, seriesNames, xKey, facetColumn, facetGrid);
	const facetMark = getFacetMarkSpec(facetColumn, facetGrid);
	const labelMark = buildFacetLabelMark(facetColumn, facetGrid);

	/** @type {any[]} */
	const marks = [...extraMarks];

	if (isCategory) {
		marks.push(
			barY(
				long,
				stackY(
					groupX(
						{ y: 'sum' },
						{ x: 'x', y: 'value', fill: 'series', ...facetMark, order: seriesNames }
					)
				)
			)
		);
	} else if (isLinear) {
		const halfGap = detectMedianGapMs(data) * 0.4;
		marks.push(
			rectY(
				long,
				stackY({
					x1: (/** @type {any} */ d) => d.x - halfGap,
					x2: (/** @type {any} */ d) => d.x + halfGap,
					y: 'value',
					fill: 'series',
					...facetMark,
					order: seriesNames
				})
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
					...facetMark,
					order: seriesNames
				})
			)
		);
	}

	marks.push(ruleY([0]));
	if (labelMark) marks.push(labelMark);

	return {
		style,
		...(marginRight !== undefined ? { marginRight } : {}),
		color: { ...colourScale(seriesNames, colours, labels), legend },
		x: {
			label: null,
			...(isCategory ? { tickPadding: 6, type: 'band' } : isLinear ? { type: 'linear' } : { type: 'utc' })
		},
		y: { label: null, grid: true, tickFormat: yTickFormat },
		...getFacetScales(facetColumn, facetGrid),
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
		yTickFormat = 's',
		facetColumn = null
	} = options;

	const { xKey } = detectXMode(data);
	const long = toLong(data, seriesNames, xKey, facetColumn);
	const categoryDomain = data.map((/** @type {any} */ d) => d[xKey]);

	// When facet is on, the user's facet takes the fx slot; the inner category
	// grouping moves to fy so both dimensions remain visible as a 2-D grid.
	const groupAxis = facetColumn ? 'fy' : 'fx';
	const groupScaleConfig = {
		label: null,
		domain: categoryDomain,
		padding: 0.1,
		tickPadding: 6,
		tickRotate: -30,
		axis: facetColumn ? /** @type {const} */ ('left') : /** @type {const} */ ('bottom')
	};

	return {
		style,
		...(marginRight !== undefined ? { marginRight } : {}),
		color: { ...colourScale(seriesNames, colours, labels), legend },
		x: { axis: null, type: 'band', domain: seriesNames, padding: 0.05 },
		y: { label: null, grid: true, tickFormat: yTickFormat },
		[groupAxis]: groupScaleConfig,
		...(facetColumn ? { fx: { label: null, padding: 0.05 } } : {}),
		marks: [
			...extraMarks,
			barY(long, {
				x: 'series',
				y: 'value',
				[groupAxis]: 'x',
				...(facetColumn ? { fx: FACET_FIELD } : {}),
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
		yTickFormat,
		facetColumn = null,
		facetGrid = null
	} = options;
	const long = toLong(data, seriesNames, 'category', facetColumn, facetGrid);
	const autoMarginLeft = computeAutoMarginLeft(data, marginLeft);
	const facetMark = getFacetMarkSpec(facetColumn, facetGrid);
	const labelMark = buildFacetLabelMark(facetColumn, facetGrid);

	return {
		style,
		marginLeft: autoMarginLeft,
		...(marginRight !== undefined ? { marginRight } : {}),
		color: { ...colourScale(seriesNames, colours, labels), legend },
		y: { label: null, tickPadding: 6, type: 'band', padding: 0.15 },
		x: {
			label: null,
			grid: true,
			zero: true,
			...(yTickFormat ? { tickFormat: yTickFormat } : {})
		},
		...getFacetScales(facetColumn, facetGrid),
		marks: [
			...extraMarks,
			barX(
				long,
				stackX(
					groupY(
						{ x: 'sum' },
						{ y: 'x', x: 'value', fill: 'series', ...facetMark, order: seriesNames }
					)
				)
			),
			ruleX([0]),
			...(labelMark ? [labelMark] : [])
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
		yTickFormat = 's',
		facetColumn = null
	} = options;
	const long = toLong(data, seriesNames, 'category', facetColumn);
	const autoMarginLeft = computeAutoMarginLeft(data, marginLeft);
	const categoryDomain = data.map((/** @type {any} */ d) => d.category);

	// When facet is on, fx is taken; the inner category grouping stays on fy.
	// Plot will render fy panels stacked within each fx column — a 2-D grid.
	const innerScaleConfig = {
		label: null,
		domain: categoryDomain,
		padding: 0.1,
		tickPadding: 6,
		axis: /** @type {const} */ ('left')
	};

	return {
		style,
		marginLeft: autoMarginLeft,
		...(marginRight !== undefined ? { marginRight } : {}),
		color: { ...colourScale(seriesNames, colours, labels), legend },
		y: { axis: null, type: 'band', domain: seriesNames, padding: 0.05 },
		x: { label: null, grid: true, zero: true, tickFormat: yTickFormat },
		fy: innerScaleConfig,
		...(facetColumn ? { fx: { label: null, padding: 0.05 } } : {}),
		marks: [
			...extraMarks,
			barX(long, {
				y: 'series',
				x: 'value',
				fy: 'x',
				...(facetColumn ? { fx: FACET_FIELD } : {}),
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
		horizontal = false,
		facetColumn = null,
		facetGrid = null
	} = options;

	const long = data
		.filter((row) => row[valueKey] != null)
		.map((row) => {
			const out = /** @type {Record<string, any>} */ ({
				x: row.category,
				value: Number(row[valueKey]),
				colourGroup: row[colourSeriesKey] ?? 'Unknown'
			});
			if (facetColumn) {
				out.facet = row[facetColumn];
				if (facetGrid) {
					const pos = facetGrid.indexByFacet.get(row[facetColumn]);
					if (pos) {
						out._fx = pos.col;
						out._fy = pos.row;
					}
				}
			}
			return out;
		});

	const colorScale = {
		domain: colourGroupNames,
		range: colourGroupNames.map((g) => colours[g]),
		legend,
		tickFormat: (/** @type {string} */ d) => labels[d] || d
	};

	const facetMark = getFacetMarkSpec(facetColumn, facetGrid);
	const facetScale = getFacetScales(facetColumn, facetGrid);
	const labelMark = buildFacetLabelMark(facetColumn, facetGrid);

	if (horizontal) {
		const autoMarginLeft = computeAutoMarginLeft(data, marginLeft);
		return {
			style,
			marginLeft: autoMarginLeft,
			...(marginRight !== undefined ? { marginRight } : {}),
			color: colorScale,
			y: { label: null, tickPadding: 6, type: 'band', padding: 0.15 },
			x: {
				label: null,
				grid: true,
				zero: true,
				type: 'linear',
				...(yTickFormat ? { tickFormat: yTickFormat } : {})
			},
			...facetScale,
			marks: [
				...extraMarks,
				barX(long, { y: 'x', x1: 0, x2: 'value', fill: 'colourGroup', ...facetMark }),
				ruleX([0]),
				...(labelMark ? [labelMark] : [])
			]
		};
	}

	return {
		style,
		...(marginRight !== undefined ? { marginRight } : {}),
		color: colorScale,
		x: { label: null, tickPadding: 6, type: 'band' },
		y: { label: null, grid: true, ...(yTickFormat ? { tickFormat: yTickFormat } : {}) },
		...facetScale,
		marks: [
			...extraMarks,
			barY(long, { x: 'x', y1: 0, y2: 'value', fill: 'colourGroup', ...facetMark }),
			ruleY([0]),
			...(labelMark ? [labelMark] : [])
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
		yTickFormat,
		facetColumn = null,
		facetGrid = null
	} = options;
	const { xKey, isLinear } = detectXMode(data);
	const long = toLong(data, seriesNames, xKey, facetColumn, facetGrid);
	const facetMark = getFacetMarkSpec(facetColumn, facetGrid);
	const labelMark = buildFacetLabelMark(facetColumn, facetGrid);

	return {
		style,
		...(marginLeft !== undefined ? { marginLeft } : {}),
		...(marginRight !== undefined ? { marginRight } : {}),
		color: { ...colourScale(seriesNames, colours, labels), legend },
		x: {
			label: null,
			...(xDomain ? { domain: xDomain } : {}),
			...(xType ? { type: /** @type {any} */ (xType) } : {}),
			...(isLinear ? { type: 'linear' } : {}),
			...(gridlines ? { axis: null } : {}),
		},
		y: {
			label: null,
			grid: !gridlines,
			...(yTickFormat ? { tickFormat: yTickFormat } : {}),
			...(yDomain ? { domain: yDomain } : {}),
		},
		...getFacetScales(facetColumn, facetGrid),
		marks: [
			...(gridlines ? gridlines.gridlineMarks : []),
			...extraMarks,
			dot(long, {
				x: 'x',
				y: 'value',
				stroke: 'series',
				fill: 'series',
				...facetMark,
				fillOpacity: 0.6,
				r: 3
			}),
			ruleY([0]),
			...(labelMark ? [labelMark] : [])
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
		case 'bar-grouped':
		case 'bar':
		case 'grouped-bar':
		case 'column':
		case 'column-stacked':
		case 'column-grouped':
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
		yTickFormat,
		seriesLineStyles = {},
		facetColumn = null,
		facetGrid = null
	} = options;

	const defaultMarkType = globalTypeToMarkType(defaultChartType);
	const facetMark = getFacetMarkSpec(facetColumn, facetGrid);
	const labelMark = buildFacetLabelMark(facetColumn, facetGrid);

	// Detect whether data is time-series, category, or linear
	const { xKey, isCategory, isLinear } = detectXMode(data);

	// Partition series by effective mark type
	/** @type {Record<SeriesMarkType, string[]>} */
	const groups = { area: [], line: [], bar: [], dot: [] };
	/** @param {string} t @returns {SeriesMarkType} */
	const toMark = (t) => /** @type {SeriesMarkType} */ (t === 'column' ? 'bar' : t);
	for (const name of seriesNames) {
		const markType = toMark(seriesChartTypes[name]) || defaultMarkType;
		groups[markType].push(name);
	}

	// Build marks for each group
	/** @type {any[]} */
	const marks = [];

	if (gridlines) marks.push(...gridlines.gridlineMarks);
	marks.push(...extraMarks);

	// Area series (stacked together)
	if (groups.area.length > 0) {
		const long = toLong(data, groups.area, xKey, facetColumn, facetGrid);
		marks.push(
			areaY(
				long,
				stackY({
					x: 'x',
					y: 'value',
					fill: 'series',
					...facetMark,
					...(curve ? { curve } : {}),
					order: groups.area
				})
			)
		);
	}

	// Bar series
	if (groups.bar.length > 0) {
		const long = toLong(data, groups.bar, xKey, facetColumn, facetGrid);
		if (isCategory) {
			marks.push(
				barY(
					long,
					stackY(
						groupX(
							{ y: 'sum' },
							{ x: 'x', y: 'value', fill: 'series', ...facetMark, order: groups.bar }
						)
					)
				)
			);
		} else if (isLinear) {
			const halfGap = detectMedianGapMs(data) * 0.4;
			marks.push(
				rectY(
					long,
					stackY({
						x1: (/** @type {any} */ d) => d.x - halfGap,
						x2: (/** @type {any} */ d) => d.x + halfGap,
						y: 'value',
						fill: 'series',
						...facetMark,
						order: groups.bar
					})
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
						...facetMark,
						order: groups.bar
					})
				)
			);
		}
	}

	// Line series (overlaid, grouped by dash pattern)
	if (groups.line.length > 0) {
		marks.push(
			...buildLineMarks(data, groups.line, xKey, seriesLineStyles, curve, facetColumn, facetGrid)
		);
	}

	// Dot series (overlaid)
	if (groups.dot.length > 0) {
		const long = toLong(data, groups.dot, xKey, facetColumn, facetGrid);
		marks.push(
			dot(long, {
				x: 'x',
				y: 'value',
				stroke: 'series',
				fill: 'series',
				...facetMark,
				fillOpacity: 0.6,
				r: 3
			})
		);
	}

	marks.push(ruleY([0]));
	if (labelMark) marks.push(labelMark);

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
			...(isLinear ? { type: 'linear' } : {}),
			...(gridlines ? { axis: null } : {}),
		},
		y: {
			label: null,
			grid: !gridlines,
			...(yTickFormat ? { tickFormat: yTickFormat } : {}),
			...(yDomain ? { domain: yDomain } : {}),
		},
		...getFacetScales(facetColumn, facetGrid),
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
