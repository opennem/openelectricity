/**
 * Annotation system for Observable Plot charts.
 *
 * Supports multiple annotation types that translate into Plot marks
 * with smart margin adjustments. All annotation types accept an optional
 * `style` object for visual customisation.
 *
 * @typedef {Object} AnnotationStyle
 * @property {string} [colour] - Text fill colour (also default line stroke)
 * @property {number} [fontSize]
 * @property {string} [fontWeight] - e.g. 'bold', 'normal'
 * @property {string} [fontFamily]
 * @property {string} [lineColour] - Line stroke colour (overrides colour)
 * @property {number} [lineWidth] - Line stroke width
 * @property {'solid' | 'dashed' | 'dotted'} [lineStyle]
 *
 * @typedef {Object} EndLabelsAnnotation
 * @property {'end-labels'} type
 * @property {AnnotationStyle} [style]
 *
 * @typedef {Object} XRuleAnnotation
 * @property {'x-rule'} type
 * @property {string | Date} x - X position for the vertical rule
 * @property {string} text - Label text
 * @property {AnnotationStyle} [style]
 *
 * @typedef {Object} BarLabelsAnnotation
 * @property {'bar-labels'} type
 * @property {AnnotationStyle} [style]
 *
 * @typedef {Object} PointAnnotation
 * @property {'point'} type
 * @property {string | Date} x - X position (date string or category)
 * @property {string} [series] - Series name to look up y value from data
 * @property {number} [y] - Explicit y position (used if series not provided)
 * @property {string} text - Annotation text
 * @property {boolean} [arrow] - Show arrow pointing to the data point
 * @property {boolean} [stacked] - Resolve y to the stacked position (midpoint of the series band)
 * @property {AnnotationStyle} [style]
 *
 * @typedef {EndLabelsAnnotation | XRuleAnnotation | BarLabelsAnnotation | PointAnnotation} Annotation
 *
 * @typedef {Object} AnnotationResult
 * @property {any[]} marks - Observable Plot marks to add
 * @property {number} marginRight - Extra right margin needed (px)
 */

import { text, ruleX, link } from '@observablehq/plot';

/** DM Mono at 10px — approximate character width in px */
const CHAR_WIDTH = 6;

/** Gap between data endpoint and label start */
const LABEL_DX = 6;

/** Extra padding after the longest label */
const LABEL_PADDING = 4;

/** Minimum vertical spacing between end labels (px) */
const MIN_LABEL_SPACING = 13;

const DEFAULT_FONT = 'DM Mono, monospace';
const DEFAULT_FONT_SIZE = 10;

/**
 * Map a lineStyle string to a strokeDasharray value.
 * @param {'solid' | 'dashed' | 'dotted' | undefined} lineStyle
 * @returns {string | undefined}
 */
function toDasharray(lineStyle) {
	if (lineStyle === 'dashed') return '4,3';
	if (lineStyle === 'dotted') return '1,3';
	return undefined; // solid or unset
}

/**
 * Format a number compactly for bar labels.
 * @param {number} value
 * @returns {string}
 */
export function formatCompact(value) {
	if (Math.abs(value) >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
	if (Math.abs(value) >= 1_000) return (value / 1_000).toFixed(1) + 'k';
	return String(Math.round(value));
}

/**
 * Compute the stacked y midpoint for a target series at a given row.
 *
 * Walks through seriesNames in order (matching stackY order), sums values
 * below the target, and returns the midpoint of the target series band.
 *
 * @param {Record<string, any>} row
 * @param {string} targetSeries
 * @param {string[]} seriesNames
 * @returns {number | null}
 */
function stackedMidpoint(row, targetSeries, seriesNames) {
	let cumulative = 0;
	for (const name of seriesNames) {
		const value = Number(row[name]) || 0;
		if (name === targetSeries) {
			return cumulative + value / 2;
		}
		cumulative += value;
	}
	return null;
}

/**
 * Process an array of annotations into Observable Plot marks and margin adjustments.
 *
 * @param {Annotation[]} annotations
 * @param {Array<Record<string, any>>} data
 * @param {string[]} seriesNames
 * @param {Record<string, string>} seriesColours
 * @param {Record<string, string>} seriesLabels
 * @param {string} chartType
 * @param {number} [height] - Chart height in px (used for anti-collision)
 * @returns {AnnotationResult}
 */
export function processAnnotations(
	annotations,
	data,
	seriesNames,
	seriesColours,
	seriesLabels,
	chartType,
	height = 300
) {
	const isTimeSeries = ['stacked-area', 'area', 'line'].includes(chartType);
	const xKey = isTimeSeries ? 'date' : 'category';

	/** @type {any[]} */
	const marks = [];
	let marginRight = 0;

	for (const annotation of annotations) {
		/** @type {AnnotationResult | null} */
		let result = null;

		switch (annotation.type) {
			case 'end-labels':
				result = endLabels(
					data,
					seriesNames,
					seriesColours,
					seriesLabels,
					xKey,
					height,
					/** @type {EndLabelsAnnotation} */ (annotation).style,
					['stacked-area', 'area'].includes(chartType)
				);
				break;
			case 'x-rule':
				result = xRule(/** @type {XRuleAnnotation} */ (annotation), xKey);
				break;
			case 'bar-labels':
				result = barLabels(
					data,
					seriesNames,
					xKey,
					/** @type {BarLabelsAnnotation} */ (annotation).style
				);
				break;
			case 'point':
				result = pointAnnotation(
					/** @type {PointAnnotation} */ (annotation),
					data,
					seriesNames,
					seriesColours,
					xKey
				);
				break;
			default:
				break;
		}

		if (result) {
			marks.push(...result.marks);
			marginRight = Math.max(marginRight, result.marginRight);
		}
	}

	return { marks, marginRight };
}

// ── End Labels ──────────────────────────────────────────────────

/**
 * Resolve vertical overlaps between end labels.
 *
 * @param {Array<{ x: any, y: number, label: string, colour: string, dy: number }>} labelData
 * @param {Array<Record<string, any>>} data
 * @param {string[]} seriesNames
 * @param {number} height
 * @param {boolean} [stacked] - Whether the chart uses stacked positioning
 */
function resolveOverlaps(labelData, data, seriesNames, height, stacked = false) {
	if (labelData.length <= 1) return;

	let yMin, yMax;
	if (stacked) {
		const totals = data.map((row) =>
			seriesNames.reduce((sum, name) => sum + (Number(row[name]) || 0), 0)
		);
		yMin = 0;
		yMax = Math.max(...totals);
	} else {
		const allValues = data.flatMap((row) =>
			seriesNames.map((name) => row[name]).filter((v) => v != null)
		);
		yMin = Math.min(0, ...allValues);
		yMax = Math.max(...allValues);
	}
	const yRange = yMax - yMin || 1;

	const plotHeight = Math.max(height - 50, 100);

	/** @type {Array<{ idx: number, pixelY: number }>} */
	const positions = labelData.map((d, idx) => ({
		idx,
		pixelY: plotHeight * (1 - (d.y - yMin) / yRange)
	}));

	positions.sort((a, b) => a.pixelY - b.pixelY);

	for (let i = 1; i < positions.length; i++) {
		const gap = positions[i].pixelY - positions[i - 1].pixelY;
		if (gap < MIN_LABEL_SPACING) {
			positions[i].pixelY = positions[i - 1].pixelY + MIN_LABEL_SPACING;
		}
	}

	for (const pos of positions) {
		const original = plotHeight * (1 - (labelData[pos.idx].y - yMin) / yRange);
		labelData[pos.idx].dy = Math.round(pos.pixelY - original);
	}
}

/**
 * Create end-of-series label marks with anti-collision.
 *
 * @param {Array<Record<string, any>>} data
 * @param {string[]} seriesNames
 * @param {Record<string, string>} seriesColours
 * @param {Record<string, string>} seriesLabels
 * @param {string} xKey
 * @param {number} height
 * @param {AnnotationStyle} [style]
 * @param {boolean} [stacked] - Whether the chart uses stacked positioning
 * @returns {AnnotationResult}
 */
export function endLabels(
	data,
	seriesNames,
	seriesColours,
	seriesLabels,
	xKey,
	height,
	style,
	stacked = false
) {
	if (!data.length) return { marks: [], marginRight: 0 };

	const fontSize = style?.fontSize ?? DEFAULT_FONT_SIZE;
	const fontFamily = style?.fontFamily ?? DEFAULT_FONT;
	const fontWeight = style?.fontWeight;

	/** @type {Array<{ x: any, y: number, label: string, colour: string, dy: number }>} */
	const labelData = [];
	let longestLabel = 0;

	for (const name of seriesNames) {
		for (let i = data.length - 1; i >= 0; i--) {
			if (data[i][name] != null) {
				const label = seriesLabels[name] || name;
				const y = stacked ? stackedMidpoint(data[i], name, seriesNames) : data[i][name];
				if (y == null) break;
				labelData.push({
					x: data[i][xKey],
					y,
					label,
					colour: style?.colour ?? seriesColours[name] ?? '#888',
					dy: 0
				});
				longestLabel = Math.max(longestLabel, label.length);
				break;
			}
		}
	}

	if (!labelData.length) return { marks: [], marginRight: 0 };

	resolveOverlaps(labelData, data, seriesNames, height, stacked);

	const charWidth = fontSize * (CHAR_WIDTH / DEFAULT_FONT_SIZE);
	const marginRight = LABEL_DX + longestLabel * charWidth + LABEL_PADDING;

	const marks = labelData.map((d) =>
		text([d], {
			x: 'x',
			y: 'y',
			text: 'label',
			fill: d.colour,
			textAnchor: 'start',
			dx: LABEL_DX,
			dy: d.dy,
			fontSize,
			fontFamily,
			...(fontWeight ? { fontWeight } : {})
		})
	);

	return { marks, marginRight };
}

// ── X-Rule ──────────────────────────────────────────────────────

/**
 * Create a vertical rule at a specific x position with a text label.
 *
 * @param {XRuleAnnotation} annotation
 * @param {string} xKey
 * @returns {AnnotationResult}
 */
function xRule(annotation, xKey) {
	const { x: rawX, text: label, style } = annotation;
	const x = xKey === 'date' ? new Date(rawX) : rawX;

	const lineColour = style?.lineColour ?? style?.colour ?? '#888';
	const lineWidth = style?.lineWidth ?? 0.5;
	const dasharray = toDasharray(style?.lineStyle ?? 'dashed');

	const textColour = style?.colour ?? '#666';
	const fontSize = style?.fontSize ?? 9;
	const fontFamily = style?.fontFamily ?? DEFAULT_FONT;
	const fontWeight = style?.fontWeight;

	return {
		marks: [
			ruleX([x], {
				stroke: lineColour,
				strokeWidth: lineWidth,
				...(dasharray ? { strokeDasharray: dasharray } : {})
			}),
			text([{ x }], {
				x: 'x',
				text: () => label,
				frameAnchor: 'top',
				textAnchor: 'start',
				dx: 4,
				dy: 6,
				fontSize,
				fontFamily,
				fill: textColour,
				...(fontWeight ? { fontWeight } : {})
			})
		],
		marginRight: 0
	};
}

// ── Bar Labels ──────────────────────────────────────────────────

/**
 * Create total value labels above stacked bars.
 *
 * @param {Array<Record<string, any>>} data
 * @param {string[]} seriesNames
 * @param {string} xKey
 * @param {AnnotationStyle} [style]
 * @returns {AnnotationResult}
 */
function barLabels(data, seriesNames, xKey, style) {
	const labelData = data.map((row) => {
		const total = seriesNames.reduce((sum, name) => sum + (Number(row[name]) || 0), 0);
		return {
			x: row[xKey],
			y: total,
			label: formatCompact(total)
		};
	});

	const textColour = style?.colour ?? '#666';
	const fontSize = style?.fontSize ?? 9;
	const fontFamily = style?.fontFamily ?? DEFAULT_FONT;
	const fontWeight = style?.fontWeight;

	return {
		marks: [
			text(labelData, {
				x: 'x',
				y: 'y',
				text: 'label',
				textAnchor: 'middle',
				dy: -6,
				fontSize,
				fontFamily,
				fill: textColour,
				clip: false,
				...(fontWeight ? { fontWeight } : {})
			})
		],
		marginRight: 0
	};
}

// ── Point Annotation ────────────────────────────────────────────

/**
 * Create a point annotation with text and optional arrow.
 * When `stacked: true`, resolves y to the midpoint of the series band.
 *
 * @param {PointAnnotation} annotation
 * @param {Array<Record<string, any>>} data
 * @param {string[]} seriesNames
 * @param {Record<string, string>} seriesColours
 * @param {string} xKey
 * @returns {AnnotationResult}
 */
export function pointAnnotation(annotation, data, seriesNames, seriesColours, xKey) {
	const {
		x: rawX,
		series,
		y: explicitY,
		text: label,
		arrow = true,
		stacked = false,
		style
	} = annotation;

	const x = xKey === 'date' ? new Date(rawX) : rawX;

	// Resolve y value
	let y = explicitY;
	if (series && y == null) {
		const row = data.find((d) => String(d[xKey]) === String(x) || +d[xKey] === +x);
		if (row) {
			y = stacked ? stackedMidpoint(row, series, seriesNames) : row[series];
		}
	}

	if (y == null) return { marks: [], marginRight: 0 };

	const defaultColour = series ? seriesColours[series] || '#888' : '#888';
	const textColour = style?.colour ?? defaultColour;
	const fontSize = style?.fontSize ?? DEFAULT_FONT_SIZE;
	const fontFamily = style?.fontFamily ?? DEFAULT_FONT;
	const fontWeight = style?.fontWeight;

	const lineColour = style?.lineColour ?? style?.colour ?? defaultColour;
	const lineWidth = style?.lineWidth ?? 0.5;
	const dasharray = toDasharray(style?.lineStyle);

	/** @type {any[]} */
	const marks = [];

	if (arrow) {
		marks.push(
			link([{ x, y }], {
				x1: 'x',
				y1: 'y',
				x2: 'x',
				y2: 'y',
				stroke: lineColour,
				strokeWidth: lineWidth,
				...(dasharray ? { strokeDasharray: dasharray } : {}),
				markerEnd: 'arrow'
			})
		);
	}

	marks.push(
		text([{ x, y, label }], {
			x: 'x',
			y: 'y',
			text: 'label',
			fill: textColour,
			dy: -10,
			fontSize,
			fontFamily,
			...(fontWeight ? { fontWeight } : {})
		})
	);

	return { marks, marginRight: 0 };
}
