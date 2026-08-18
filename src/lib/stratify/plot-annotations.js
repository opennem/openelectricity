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

import { text, ruleX, link, dot } from '@observablehq/plot';

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
 * @typedef {Object} DataAnnotationResult
 * @property {any[]} backgroundMarks
 * @property {any[]} foregroundMarks
 * @property {number} marginTop
 */

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
 * Resolve a data annotation's point series by key or displayed label.
 * @param {string | null} requested
 * @param {string[]} seriesNames
 * @param {Record<string, string>} seriesLabels
 */
function resolveSeriesName(requested, seriesNames, seriesLabels) {
	if (!requested) return null;
	if (seriesNames.includes(requested)) return requested;
	const wanted = requested.trim().toLowerCase();
	return (
		seriesNames.find(
			(name) => name.toLowerCase() === wanted || seriesLabels[name]?.toLowerCase() === wanted
		) ?? null
	);
}

/**
 * Find the chart row at an annotation's X position. Temporal and linear axes
 * use the nearest row; ordinal axes require an exact category match.
 * @param {Array<Record<string, any>>} data
 * @param {string} xKey
 * @param {Date | number | string} x
 */
function findAnnotationRow(data, xKey, x) {
	if (xKey === 'category') return data.find((row) => String(row[xKey]) === String(x)) ?? null;
	const target = x instanceof Date ? x.getTime() : Number(x);
	if (!Number.isFinite(target)) return null;
	let closest = null;
	let distance = Infinity;
	for (const row of data) {
		const candidate = row[xKey] instanceof Date ? row[xKey].getTime() : Number(row[xKey]);
		const nextDistance = Math.abs(candidate - target);
		if (Number.isFinite(candidate) && nextDistance < distance) {
			closest = row;
			distance = nextDistance;
		}
	}
	return closest;
}

/**
 * Estimate X pixel positions and assign labels to the first non-overlapping
 * lane. This keeps event labels compact without requiring a per-row lane.
 * @param {Array<{x: Date | number | string, text: string, style?: import('./annotation-data.js').AnnotationStyleConfig}>} annotations
 * @param {Array<Record<string, any>>} data
 * @param {string} xKey
 * @param {number} width
 * @param {number} fontSize
 * @param {import('./annotation-data.js').AnnotationStyleConfig} fallbackStyle
 */
function assignLabelLanes(annotations, data, xKey, width, fontSize, fallbackStyle) {
	const plotWidth = Math.max(width - 80, 160);
	const dataValues = data.map((row) => row[xKey]);
	const categories = xKey === 'category' ? [...new Set(dataValues.map(String))] : [];
	const numericValues = dataValues
		.map((value) => (value instanceof Date ? value.getTime() : Number(value)))
		.filter(Number.isFinite);
	const min = numericValues.length ? Math.min(...numericValues) : 0;
	const max = numericValues.length ? Math.max(...numericValues) : min + 1;
	const positioned = annotations.map((annotation, index) => {
		let ratio;
		if (xKey === 'category') {
			const categoryIndex = Math.max(0, categories.indexOf(String(annotation.x)));
			ratio = categories.length <= 1 ? 0.5 : categoryIndex / (categories.length - 1);
		} else {
			const value = annotation.x instanceof Date ? annotation.x.getTime() : Number(annotation.x);
			ratio = max === min ? 0.5 : (value - min) / (max - min);
		}
		const pixelX = Math.max(0, Math.min(plotWidth, ratio * plotWidth));
		const appearance = annotation.style ?? fallbackStyle;
		const maxWidth = Number.isFinite(appearance.labelMaxWidth)
			? Math.max(1, appearance.labelMaxWidth)
			: Infinity;
		const labelWidth = Math.min(
			maxWidth,
			Math.max(fontSize * 2, annotation.text.length * fontSize * 0.58)
		);
		return { index, pixelX, start: pixelX - labelWidth / 2, end: pixelX + labelWidth / 2 };
	});
	positioned.sort((a, b) => a.pixelX - b.pixelX);
	/** @type {number[]} */
	const laneEnds = [];
	const lanes = Array(annotations.length).fill(0);
	for (const item of positioned) {
		let lane = laneEnds.findIndex((end) => item.start > end + 6);
		if (lane === -1) lane = laneEnds.length;
		laneEnds[lane] = item.end;
		lanes[item.index] = lane;
	}
	return { lanes, laneCount: laneEnds.length };
}

/**
 * Convert compiled annotation dataset rows into Plot marks.
 * @param {import('./annotation-data.js').DataAnnotation[]} annotations
 * @param {Array<Record<string, any>>} data
 * @param {string[]} seriesNames
 * @param {Record<string, string>} seriesLabels
 * @param {import('./annotation-data.js').AnnotationStyleConfig} style
 * @param {number} width
 * @param {(value: number) => number} [rightAxisTransform]
 * @param {string} [fontFamily]
 * @returns {DataAnnotationResult}
 */
export function processDataAnnotations(
	annotations,
	data,
	seriesNames,
	seriesLabels,
	style,
	width,
	rightAxisTransform,
	fontFamily = DEFAULT_FONT
) {
	if (!annotations.length || !data.length) {
		return { backgroundMarks: [], foregroundMarks: [], marginTop: 0 };
	}
	const xKey = 'date' in data[0] ? 'date' : 'linear' in data[0] ? 'linear' : 'category';
	const rules = annotations.filter((annotation) => annotation.type === 'rule');
	const points = annotations.filter((annotation) => annotation.type === 'point');
	const maxFontSize = Math.max(
		6,
		...annotations.map((annotation) => {
			const appearance = annotation.style ?? style;
			return Number.isFinite(appearance.fontSize)
				? Math.max(6, appearance.fontSize)
				: Number.isFinite(style.fontSize)
					? Math.max(6, style.fontSize)
					: 12;
		})
	);
	const { lanes: ruleLanes, laneCount } = assignLabelLanes(
		rules,
		data,
		xKey,
		width,
		maxFontSize,
		style
	);
	const { lanes: pointLanes } = assignLabelLanes(points, data, xKey, width, maxFontSize, style);
	const maxRuleLabelHeight = Math.max(
		maxFontSize,
		...rules.map((annotation) => {
			const appearance = annotation.style ?? style;
			const fontSize = Number.isFinite(appearance.fontSize) ? Math.max(6, appearance.fontSize) : 12;
			const maxWidth = Number.isFinite(appearance.labelMaxWidth)
				? Math.max(1, appearance.labelMaxWidth)
				: Infinity;
			const estimatedWidth = annotation.text.length * fontSize * 0.58;
			const lines = Number.isFinite(maxWidth)
				? Math.max(1, Math.ceil(estimatedWidth / maxWidth))
				: 1;
			return lines * fontSize * 1.1;
		})
	);
	const ruleLaneStep = maxRuleLabelHeight + 4;
	const numericYValues = data.flatMap((row) =>
		seriesNames.map((name) => Number(row[name])).filter(Number.isFinite)
	);
	const yRange = numericYValues.length
		? Math.max(...numericYValues) - Math.min(...numericYValues) || 1
		: 1;
	/** @type {any[]} */
	const backgroundMarks = [];
	/** @type {any[]} */
	const foregroundMarks = [];

	for (let index = 0; index < rules.length; index++) {
		const annotation = rules[index];
		const appearance = { ...style, ...(annotation.style ?? {}) };
		const lineWidth = Number.isFinite(appearance.lineWidth) ? Math.max(0, appearance.lineWidth) : 1;
		const fontSize = Number.isFinite(appearance.fontSize) ? Math.max(6, appearance.fontSize) : 12;
		const dasharray = toDasharray(appearance.lineStyle);
		const labelMaxWidth = Number.isFinite(appearance.labelMaxWidth)
			? Math.max(fontSize, appearance.labelMaxWidth)
			: Infinity;
		const backgroundOpacity = Number.isFinite(appearance.labelBackgroundOpacity)
			? Math.max(0, Math.min(1, appearance.labelBackgroundOpacity))
			: 0;
		const labelPosition = annotation.labelPosition ?? 'top';
		const isLeft = labelPosition === 'left' || labelPosition.endsWith('-left');
		const isRight = labelPosition === 'right' || labelPosition.endsWith('-right');
		const isBottom = labelPosition.startsWith('bottom');
		const isMiddle = labelPosition === 'left' || labelPosition === 'right';
		backgroundMarks.push(
			ruleX([annotation.x], {
				stroke: annotation.colour,
				strokeWidth: lineWidth,
				...(dasharray ? { strokeDasharray: dasharray } : {})
			})
		);
		foregroundMarks.push(
			text([{ x: annotation.x, label: annotation.text }], {
				x: 'x',
				text: 'label',
				frameAnchor: isMiddle ? 'middle' : isBottom ? 'bottom' : 'top',
				textAnchor: isLeft ? 'end' : isRight ? 'start' : 'middle',
				dx: isLeft ? -8 : isRight ? 8 : 0,
				dy: isMiddle ? ruleLanes[index] * ruleLaneStep : -(8 + ruleLanes[index] * ruleLaneStep),
				fill: annotation.labelColour ?? style.labelColour,
				stroke: appearance.labelBackgroundColour,
				strokeOpacity: backgroundOpacity,
				strokeWidth: backgroundOpacity > 0 ? 6 : 0,
				strokeLinejoin: 'round',
				paintOrder: 'stroke',
				fontSize,
				fontFamily,
				fontWeight: appearance.fontWeight,
				lineWidth: labelMaxWidth / fontSize,
				lineAnchor: isMiddle ? 'middle' : 'bottom',
				clip: false
			})
		);
	}

	for (let index = 0; index < points.length; index++) {
		const annotation = points[index];
		const appearance = { ...style, ...(annotation.style ?? {}) };
		const lineWidth = Number.isFinite(appearance.lineWidth) ? Math.max(0, appearance.lineWidth) : 1;
		const fontSize = Number.isFinite(appearance.fontSize) ? Math.max(6, appearance.fontSize) : 12;
		const pointRadius = Number.isFinite(appearance.pointRadius)
			? Math.max(0, appearance.pointRadius)
			: 6;
		const dasharray = toDasharray(appearance.lineStyle);
		const labelMaxWidth = Number.isFinite(appearance.labelMaxWidth)
			? Math.max(fontSize, appearance.labelMaxWidth)
			: Infinity;
		const backgroundOpacity = Number.isFinite(appearance.labelBackgroundOpacity)
			? Math.max(0, Math.min(1, appearance.labelBackgroundOpacity))
			: 0;
		const labelPosition = annotation.labelPosition ?? 'top';
		const isLeft = labelPosition === 'left';
		const isRight = labelPosition === 'right';
		const isBottom = labelPosition === 'bottom';
		const series = resolveSeriesName(annotation.series, seriesNames, seriesLabels);
		let y = annotation.y;
		if (y == null && series) {
			const row = findAnnotationRow(data, xKey, annotation.x);
			const value = row?.[series];
			y = value == null ? null : Number(value);
		}
		if (y != null && annotation.y != null && annotation.axis === 'right' && rightAxisTransform) {
			y = rightAxisTransform(y);
		}
		if (y == null || !Number.isFinite(y)) continue;
		const labelOffset = yRange * 0.05 * (pointLanes[index] + 1);
		const labelY = isLeft || isRight ? y : isBottom ? y - labelOffset : y + labelOffset;
		const datum = { x: annotation.x, y, labelY, label: annotation.text };
		foregroundMarks.push(
			dot([datum], {
				x: 'x',
				y: 'y',
				r: pointRadius,
				fill: annotation.colour,
				stroke: '#ffffff',
				strokeWidth: 1
			}),
			...(!isLeft && !isRight
				? [
						link([datum], {
							x1: 'x',
							y1: 'y',
							x2: 'x',
							y2: 'labelY',
							stroke: annotation.colour,
							strokeWidth: lineWidth,
							...(dasharray ? { strokeDasharray: dasharray } : {})
						})
					]
				: []),
			text([datum], {
				x: 'x',
				y: 'labelY',
				text: 'label',
				textAnchor: isLeft ? 'end' : isRight ? 'start' : 'middle',
				dx: isLeft ? -(pointRadius + 8) : isRight ? pointRadius + 8 : 0,
				dy: isBottom ? 4 : isLeft || isRight ? 0 : -4,
				fill: annotation.labelColour ?? style.labelColour,
				stroke: appearance.labelBackgroundColour,
				strokeOpacity: backgroundOpacity,
				strokeWidth: backgroundOpacity > 0 ? 6 : 0,
				strokeLinejoin: 'round',
				paintOrder: 'stroke',
				fontSize,
				fontFamily,
				fontWeight: appearance.fontWeight,
				lineWidth: labelMaxWidth / fontSize,
				lineAnchor: isBottom ? 'top' : isLeft || isRight ? 'middle' : 'bottom',
				clip: false
			})
		);
	}

	return {
		backgroundMarks,
		foregroundMarks,
		marginTop: rules.some((annotation) => (annotation.labelPosition ?? 'top').startsWith('top'))
			? 12 + laneCount * ruleLaneStep
			: 0
	};
}

/**
 * Format a number compactly for bar labels.
 * @param {number} value
 * @returns {string}
 */
export function formatCompact(value) {
	const trim = (/** @type {number} */ n) => n.toFixed(1).replace(/\.0$/, '');
	if (Math.abs(value) >= 1_000_000) return trim(value / 1_000_000) + 'M';
	if (Math.abs(value) >= 1_000) return trim(value / 1_000) + 'k';
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
 * @param {AnnotationStyle} [baseStyle] - Theme defaults overridden by each annotation's style
 * @returns {AnnotationResult}
 */
export function processAnnotations(
	annotations,
	data,
	seriesNames,
	seriesColours,
	seriesLabels,
	chartType,
	height = 300,
	baseStyle = {}
) {
	const isTimeSeries = ['stacked-area', 'area', 'line', 'scatter'].includes(chartType);
	const xKey = isTimeSeries ? 'date' : 'category';

	/** @type {any[]} */
	const marks = [];
	let marginRight = 0;

	for (const annotation of annotations) {
		const style = { ...baseStyle, ...(annotation.style ?? {}) };
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
					style,
					['stacked-area', 'area'].includes(chartType)
				);
				break;
			case 'x-rule':
				result = xRule({ .../** @type {XRuleAnnotation} */ (annotation), style }, xKey);
				break;
			case 'bar-labels':
				result = barLabels(data, seriesNames, xKey, style);
				break;
			case 'point':
				result = pointAnnotation(
					{ .../** @type {PointAnnotation} */ (annotation), style },
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
