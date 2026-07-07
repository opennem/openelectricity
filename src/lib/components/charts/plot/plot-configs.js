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
	link,
	ruleX,
	ruleY,
	stackX,
	stackY,
	groupX,
	groupY,
	text,
	tip,
	pointerX,
	pointerY
} from '@observablehq/plot';
import { getLineDasharray, WATERFALL_ROLE_KEYS } from '$lib/stratify/chart-types.js';
import { formatCompact } from '$lib/stratify/plot-annotations.js';

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

/**
 * Build a value formatter for displayed numbers (tooltips, annotation labels).
 * 'auto' passes values through unchanged (Plot's default formatting); '0'–'3'
 * fix the decimal places; 'compact' abbreviates (1.2k). Non-numbers pass through.
 * @param {string} [format]
 * @returns {(value: any) => any}
 */
export function makeValueFormatter(format = 'auto') {
	if (!format || format === 'auto') return (v) => v;
	// Reuse the shared compact formatter so values match axis-tick formatting.
	if (format === 'compact') {
		return (v) => (typeof v === 'number' && isFinite(v) ? formatCompact(v) : v);
	}
	const nf = new Intl.NumberFormat('en-AU', {
		minimumFractionDigits: Number(format) || 0,
		maximumFractionDigits: Number(format) || 0
	});
	return (v) => (typeof v === 'number' && isFinite(v) ? nf.format(v) : v);
}

const SHARED_STYLE = {
	fontFamily: 'DM Mono, monospace',
	fontSize: '10px',
	background: 'transparent',
	overflow: 'visible'
};

/**
 * Build the stroke props for bar/area marks when a non-zero border width is set.
 * Returns an empty object when borderWidth is 0 so Plot keeps its default
 * (no stroke).
 * @param {number} [borderWidth]
 * @param {string} [borderColour]
 * @returns {{ stroke: string, strokeWidth: number } | {}}
 */
function borderProps(borderWidth = 0, borderColour = '#000000') {
	return borderWidth > 0 ? { stroke: borderColour, strokeWidth: borderWidth } : {};
}

/**
 * Build the per-layer separator lines for a stacked area. For each (facet, x),
 * emits one row per series carrying the cumulative-from-bottom sum, so the
 * resulting lineY (grouped via `z: 'series'`) draws a line at the top of every
 * layer — including the outer silhouette. When a series has a 0/missing value
 * at some x its line coincides with the previous layer's top, so it visually
 * merges instead of dropping to 0.
 * @param {Array<Record<string, any>>} long
 * @param {string[]} seriesNames - Stack order (bottom → top)
 * @param {string | null} [facetColumn]
 * @returns {Array<Record<string, any>>}
 */
function buildAreaLayerLines(long, seriesNames, facetColumn = null) {
	/** @type {Map<any, Map<any, { x: any, fx: any, fy: any, values: Map<string, number> }>>} */
	const byFacet = new Map();
	for (const row of long) {
		const facetVal = facetColumn ? row[FACET_FIELD] : null;
		const xKey = row.x?.valueOf?.() ?? row.x;
		let byX = byFacet.get(facetVal);
		if (!byX) {
			byX = new Map();
			byFacet.set(facetVal, byX);
		}
		let group = byX.get(xKey);
		if (!group) {
			group = {
				x: row.x,
				fx: row[FACET_X_FIELD],
				fy: row[FACET_Y_FIELD],
				values: new Map()
			};
			byX.set(xKey, group);
		}
		group.values.set(row.series, Number(row.value) || 0);
	}

	/** @type {Array<Record<string, any>>} */
	const out = [];
	for (const [facetVal, byX] of byFacet) {
		for (const group of byX.values()) {
			let cumulative = 0;
			for (const series of seriesNames) {
				cumulative += group.values.get(series) ?? 0;
				/** @type {Record<string, any>} */
				const outRow = { x: group.x, value: cumulative, series };
				if (facetColumn) {
					outRow[FACET_FIELD] = facetVal;
					if (group.fx !== undefined) outRow[FACET_X_FIELD] = group.fx;
					if (group.fy !== undefined) outRow[FACET_Y_FIELD] = group.fy;
				}
				out.push(outRow);
			}
		}
	}
	return out;
}

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
 * @property {number} [borderWidth] - Stroke width in px around bar/area marks (0 = none)
 * @property {string} [borderColour] - Stroke colour for bar/area marks (defaults to white)
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
		facetGrid = null,
		borderWidth = 0,
		borderColour
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
			...(gridlines ? { axis: null } : {})
		},
		y: {
			label: null,
			grid: !gridlines,
			tickFormat: yTickFormat,
			...(yDomain ? { domain: yDomain } : {})
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
			...(borderWidth > 0
				? [
						lineY(buildAreaLayerLines(long, seriesNames, facetColumn), {
							x: 'x',
							y: 'value',
							z: 'series',
							stroke: borderColour ?? '#000000',
							strokeWidth: borderWidth,
							...facetMark,
							...(curve ? { curve } : {})
						})
					]
				: []),
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
function buildLineMarks(
	data,
	seriesNames,
	xKey,
	seriesLineStyles,
	curve,
	facetColumn = null,
	facetGrid = null
) {
	const hasCustomStyles = seriesNames.some(
		(n) => getLineDasharray(seriesLineStyles[n]) !== undefined
	);
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

	const lineMarks = buildLineMarks(
		data,
		seriesNames,
		xKey,
		seriesLineStyles,
		curve,
		facetColumn,
		facetGrid
	);
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
			...(gridlines ? { axis: null } : {})
		},
		y: {
			label: null,
			grid: !gridlines,
			...(yTickFormat ? { tickFormat: yTickFormat } : {}),
			...(yDomain ? { domain: yDomain } : {})
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
 * @property {number} [borderWidth] - Stroke width in px around bar marks (0 = none)
 * @property {string} [borderColour] - Stroke colour for bar marks (defaults to white)
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
		facetGrid = null,
		borderWidth = 0,
		borderColour
	} = options;
	const border = borderProps(borderWidth, borderColour);

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
						{ x: 'x', y: 'value', fill: 'series', ...facetMark, ...border, order: seriesNames }
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
					...border,
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
					...border,
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
			...(isCategory
				? { tickPadding: 6, type: 'band' }
				: isLinear
					? { type: 'linear' }
					: { type: 'utc' })
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
		facetColumn = null,
		borderWidth = 0,
		borderColour
	} = options;
	const border = borderProps(borderWidth, borderColour);

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
				fill: 'series',
				...border
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
		facetGrid = null,
		borderWidth = 0,
		borderColour
	} = options;
	const border = borderProps(borderWidth, borderColour);
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
						{ y: 'x', x: 'value', fill: 'series', ...facetMark, ...border, order: seriesNames }
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
export function createGroupedHorizontalBarOptions(
	data,
	seriesNames,
	colours,
	labels,
	options = {}
) {
	const {
		style = SHARED_STYLE,
		marginLeft,
		marginRight,
		legend = true,
		extraMarks = [],
		yTickFormat = 's',
		facetColumn = null,
		borderWidth = 0,
		borderColour
	} = options;
	const border = borderProps(borderWidth, borderColour);
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
				fill: 'series',
				...border
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
		facetGrid = null,
		borderWidth = 0,
		borderColour
	} = options;
	const border = borderProps(borderWidth, borderColour);

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
				barX(long, { y: 'x', x1: 0, x2: 'value', fill: 'colourGroup', ...facetMark, ...border }),
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
			barY(long, { x: 'x', y1: 0, y2: 'value', fill: 'colourGroup', ...facetMark, ...border }),
			ruleY([0]),
			...(labelMark ? [labelMark] : [])
		]
	};
}

// ── Waterfall Chart ─────────────────────────────────────────────

/**
 * @typedef {Object} WaterfallChartOptions
 * @property {object} [style]
 * @property {number} [marginLeft]
 * @property {number} [marginRight]
 * @property {any[]} [extraMarks] - Additional marks
 * @property {string | ((d: number) => string)} [yTickFormat]
 * @property {number} [borderWidth] - Stroke width in px around bar marks (0 = none)
 * @property {string} [borderColour] - Stroke colour for bar marks
 * @property {boolean} [legend] - Show the colour legend (stacked mode only)
 * @property {'single' | 'sum' | 'stacked'} [waterfallMode] - 'single' uses the first series; 'sum' totals all series per row; 'stacked' stacks every series within each step
 * @property {boolean} [waterfallHorizontal] - Render horizontally (barX) instead of vertically (barY)
 * @property {boolean} [waterfallShowTotal] - Append a full-height "Total" bar anchored at 0
 * @property {'semantic' | 'series'} [waterfallColourMode] - 'semantic' colours by role (start/up/down/total); 'series' colours per row
 * @property {Record<string, string>} [waterfallRowColours] - Per-row (category) colour overrides for series mode
 * @property {Record<string, string>} [waterfallRowLabels] - Per-row (category) legend labels for series mode
 * @property {Record<string, string>} [waterfallSemanticColours] - Role → colour for semantic mode (starting/increase/decrease/total)
 * @property {Record<string, string>} [waterfallSemanticLabels] - Role → legend label for semantic mode
 * @property {string} [valueFormat] - Displayed-value format: '0'|'1'|'2'|'3' decimals, 'compact', or 'auto'
 */

/**
 * Waterfall chart: each bar is offset by the running cumulative total, so it
 * shows how sequential contributions build to a final value. Increases and
 * decreases are distinguished by bar direction.
 *
 * Three modes:
 * - `single`  — uses the first series; one single-coloured bar per row.
 * - `sum`     — totals all series per row; one single-coloured bar per row.
 * - `stacked` — stacks every series within each step (series-coloured segments,
 *               with a legend); the step's total still advances the running sum.
 *
 * An optional full-height "Total" bar (anchored at 0) is appended; in stacked
 * mode it stacks each series' grand total so the colours match the steps.
 *
 * Unlike the stacked-bar factories this does not use Plot's stack transform:
 * the cumulative start/end are precomputed per segment and drawn as an interval
 * mark (barY with y1/y2, or barX with x1/x2).
 *
 * @param {Array<Record<string, any>>} data - Parsed rows (category/date/linear x)
 * @param {string[]} seriesNames
 * @param {Record<string, string>} colours
 * @param {Record<string, string>} labels
 * @param {WaterfallChartOptions} [options]
 * @returns {import('@observablehq/plot').PlotOptions}
 */
export function createWaterfallOptions(data, seriesNames, colours, labels, options = {}) {
	const {
		style = SHARED_STYLE,
		marginLeft,
		marginRight,
		legend = true,
		extraMarks = [],
		yTickFormat = 's',
		borderWidth = 0,
		borderColour,
		waterfallMode = 'single',
		waterfallHorizontal = false,
		waterfallShowTotal = true,
		waterfallColourMode = 'semantic',
		waterfallRowColours = {},
		waterfallRowLabels = {},
		waterfallSemanticColours = {},
		waterfallSemanticLabels = {},
		valueFormat = '1'
	} = options;
	const formatValue = makeValueFormatter(valueFormat);
	const border = borderProps(borderWidth, borderColour);

	const { xKey } = detectXMode(data);
	const isStacked = waterfallMode === 'stacked' && seriesNames.length > 1;
	const barColour = colours[seriesNames[0]] || '#888';

	// Precompute each bar (or stacked segment) with absolute start/end offsets
	// derived from the running cumulative total.
	let running = 0;
	/** @type {Array<Record<string, any>>} */
	const bars = [];
	if (isStacked) {
		for (const row of data) {
			let segStart = running;
			for (const name of seriesNames) {
				const value = Number(row[name]) || 0;
				bars.push({ x: row[xKey], series: name, value, start: segStart, end: segStart + value });
				segStart += value;
			}
			running = segStart;
		}
	} else {
		/** @param {Record<string, any>} row */
		const rowValue = (row) =>
			waterfallMode === 'sum'
				? seriesNames.reduce((sum, name) => sum + (Number(row[name]) || 0), 0)
				: Number(row[seriesNames[0]]) || 0;
		data.forEach((row, i) => {
			const value = rowValue(row);
			const start = running;
			running += value;
			// `colourKey` ties each bar to its per-row legend entry (keyed by
			// category); `role` drives the semantic start/increase/decrease/total
			// colouring. The first bar is the starting value; the rest are deltas.
			const role = i === 0 ? 'starting' : value >= 0 ? 'increase' : 'decrease';
			bars.push({ x: row[xKey], colourKey: String(row[xKey]), role, value, start, end: running });
		});
	}

	// Band domain is one entry per category (+ optional Total), regardless of
	// how many stacked segments share each category.
	const domain = data.map((row) => row[xKey]);
	if (waterfallShowTotal) {
		if (isStacked) {
			let segStart = 0;
			for (const name of seriesNames) {
				const value = data.reduce((sum, row) => sum + (Number(row[name]) || 0), 0);
				bars.push({ x: 'Total', series: name, value, start: segStart, end: segStart + value });
				segStart += value;
			}
		} else {
			bars.push({
				x: 'Total',
				colourKey: 'Total',
				role: 'total',
				value: running,
				start: 0,
				end: running
			});
		}
		domain.push('Total');
	}

	// Colour & legend. Stacked mode colours by input series. Single/sum colour
	// each bar (CSV row) individually: the fill is the per-row `colourKey`, and
	// the colour scale's domain is the ordered list of rows so every bar gets its
	// own legend entry, defaulting to one base colour until overridden.
	const firstKey = seriesNames[0];
	const barLabel = waterfallMode === 'sum' ? 'Sum' : labels[firstKey] || firstKey;

	// Stacked colours by input series; single/sum show the change + running total.
	/** @type {Record<string, any>} */
	const tipChannels = isStacked
		? {
				Category: { value: (/** @type {any} */ d) => d.x },
				Series: { value: (/** @type {any} */ d) => labels[d.series] || d.series },
				Value: { value: (/** @type {any} */ d) => formatValue(d.value) }
			}
		: {
				Category: { value: (/** @type {any} */ d) => d.x },
				[barLabel]: { value: (/** @type {any} */ d) => formatValue(d.value) },
				'Running total': { value: (/** @type {any} */ d) => formatValue(d.end) }
			};

	let fill;
	let colorConfig;
	if (isStacked) {
		fill = 'series';
		colorConfig = { ...colourScale(seriesNames, colours, labels), legend };
	} else if (waterfallColourMode === 'semantic') {
		// Colour by bar role (starting / increase / decrease / total).
		fill = 'role';
		const roles = WATERFALL_ROLE_KEYS.filter((r) => bars.some((b) => b.role === r));
		colorConfig = {
			domain: roles,
			range: roles.map((r) => waterfallSemanticColours[r] || barColour),
			legend,
			tickFormat: (/** @type {string} */ r) => waterfallSemanticLabels[r] || r
		};
	} else {
		// Per-row colouring: each bar (CSV row) is its own legend entry.
		fill = 'colourKey';
		/** @type {string[]} */
		const rowKeys = [];
		const seenKeys = new Set();
		for (const bar of bars) {
			if (!seenKeys.has(bar.colourKey)) {
				seenKeys.add(bar.colourKey);
				rowKeys.push(bar.colourKey);
			}
		}
		colorConfig = {
			domain: rowKeys,
			range: rowKeys.map((k) => waterfallRowColours[k] || barColour),
			legend,
			tickFormat: (/** @type {string} */ k) => waterfallRowLabels[k] || k
		};
	}

	// In stacked mode, anchor the tooltip at each segment's midpoint so hovering
	// resolves to the segment under the cursor rather than the topmost bar.
	const tipPos = isStacked ? (/** @type {any} */ d) => (d.start + d.end) / 2 : 'end';

	// Map the category-axis ticks so a renamed bar shows its custom label,
	// matching the legend. In per-row mode every category can be relabelled; in
	// semantic mode only the appended "Total" bar carries a custom (role) label.
	const bandTickFormat = isStacked
		? null
		: waterfallColourMode === 'semantic'
			? (/** @type {any} */ d) => (String(d) === 'Total' ? waterfallSemanticLabels.total || d : d)
			: (/** @type {any} */ d) => waterfallRowLabels[String(d)] ?? d;

	// Auto annotations (non-stacked only): connector lines linking the running
	// total across consecutive bars, plus a change-value label on each bar —
	// above for starting/increase/total, below for decrease.
	const showAnnotations = !isStacked;
	/** @type {Array<{ a: any, b: any, level: number }>} */
	const connectors = [];
	if (showAnnotations) {
		for (let i = 0; i < bars.length - 1; i++) {
			connectors.push({ a: bars[i].x, b: bars[i + 1].x, level: bars[i].end });
		}
	}
	const topBars = showAnnotations ? bars.filter((b) => b.role !== 'decrease') : [];
	const belowBars = showAnnotations ? bars.filter((b) => b.role === 'decrease') : [];
	const labelStyle = { fontFamily: 'DM Mono, monospace', fontSize: 10, fill: '#3c3c3c' };
	const connectorStroke = { stroke: '#b0b0b0', strokeWidth: 1 };
	/** @param {any} d */
	const fmtChange = (d) => {
		const abs = formatValue(Math.abs(d.value));
		if (d.role === 'increase') return `+${abs}`;
		if (d.role === 'decrease') return `−${abs}`;
		return formatValue(Number(d.value));
	};

	if (waterfallHorizontal) {
		const autoMarginLeft = computeAutoMarginLeft(data, marginLeft);
		return {
			style,
			marginLeft: autoMarginLeft,
			...(marginRight !== undefined ? { marginRight } : {}),
			color: colorConfig,
			y: {
				label: null,
				tickPadding: 6,
				type: 'band',
				domain,
				padding: 0.15,
				...(bandTickFormat ? { tickFormat: bandTickFormat } : {})
			},
			x: { label: null, grid: true, zero: true, type: 'linear', tickFormat: yTickFormat },
			marks: [
				...extraMarks,
				...(connectors.length
					? [link(connectors, { y1: 'a', y2: 'b', x1: 'level', x2: 'level', ...connectorStroke })]
					: []),
				barX(bars, { y: 'x', x1: 'start', x2: 'end', fill, ...border }),
				ruleX([0]),
				...(showAnnotations
					? [
							text(topBars, {
								y: 'x',
								x: (/** @type {any} */ d) => Math.max(d.start, d.end),
								text: fmtChange,
								textAnchor: 'start',
								dx: 3,
								...labelStyle
							}),
							text(belowBars, {
								y: 'x',
								x: (/** @type {any} */ d) => Math.min(d.start, d.end),
								text: fmtChange,
								textAnchor: 'end',
								dx: -3,
								...labelStyle
							})
						]
					: []),
				tip(
					bars,
					pointerY({
						y: 'x',
						x: tipPos,
						channels: tipChannels,
						format: { x: false, y: false },
						preferredAnchor: 'left',
						lineHeight: 1.3,
						fontSize: 11
					})
				)
			]
		};
	}

	return {
		style,
		...(marginLeft !== undefined ? { marginLeft } : {}),
		...(marginRight !== undefined ? { marginRight } : {}),
		color: colorConfig,
		x: {
			label: null,
			tickPadding: 6,
			type: 'band',
			domain,
			...(bandTickFormat ? { tickFormat: bandTickFormat } : {})
		},
		y: { label: null, grid: true, tickFormat: yTickFormat },
		marks: [
			...extraMarks,
			...(connectors.length
				? [link(connectors, { x1: 'a', x2: 'b', y1: 'level', y2: 'level', ...connectorStroke })]
				: []),
			barY(bars, { x: 'x', y1: 'start', y2: 'end', fill, ...border }),
			ruleY([0]),
			...(showAnnotations
				? [
						text(topBars, {
							x: 'x',
							y: (/** @type {any} */ d) => Math.max(d.start, d.end),
							text: fmtChange,
							lineAnchor: 'bottom',
							dy: -3,
							...labelStyle
						}),
						text(belowBars, {
							x: 'x',
							y: (/** @type {any} */ d) => Math.min(d.start, d.end),
							text: fmtChange,
							lineAnchor: 'top',
							dy: 3,
							...labelStyle
						})
					]
				: []),
			tip(
				bars,
				pointerX({
					x: 'x',
					y: tipPos,
					channels: tipChannels,
					format: { x: false, y: false },
					preferredAnchor: 'bottom',
					lineHeight: 1.3,
					fontSize: 11
				})
			)
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
			...(gridlines ? { axis: null } : {})
		},
		y: {
			label: null,
			grid: !gridlines,
			...(yTickFormat ? { tickFormat: yTickFormat } : {}),
			...(yDomain ? { domain: yDomain } : {})
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
		facetGrid = null,
		borderWidth = 0,
		borderColour
	} = options;
	const border = borderProps(borderWidth, borderColour);

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
		if (borderWidth > 0) {
			marks.push(
				lineY(buildAreaLayerLines(long, groups.area, facetColumn), {
					x: 'x',
					y: 'value',
					z: 'series',
					stroke: borderColour ?? '#000000',
					strokeWidth: borderWidth,
					...facetMark,
					...(curve ? { curve } : {})
				})
			);
		}
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
							{ x: 'x', y: 'value', fill: 'series', ...facetMark, ...border, order: groups.bar }
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
						...border,
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
						...border,
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
			...(gridlines ? { axis: null } : {})
		},
		y: {
			label: null,
			grid: !gridlines,
			...(yTickFormat ? { tickFormat: yTickFormat } : {}),
			...(yDomain ? { domain: yDomain } : {})
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
 * @param {(value: any) => any} [formatValue] - Optional formatter for the channel values
 * @returns {Record<string, any>} Map of display label → channel (data key or value spec)
 */
export function buildTooltipChannels(tooltipLabels, formatValue) {
	const labelCounts = /** @type {Record<string, number>} */ ({});
	for (const label of Object.values(tooltipLabels)) {
		labelCounts[label] = (labelCounts[label] || 0) + 1;
	}

	return Object.fromEntries(
		Object.entries(tooltipLabels).map(([key, label]) => {
			const displayLabel = labelCounts[label] > 1 ? `${label} (${key})` : label;
			const channel = formatValue ? { value: (/** @type {any} */ d) => formatValue(d[key]) } : key;
			return [displayLabel, channel];
		})
	);
}
