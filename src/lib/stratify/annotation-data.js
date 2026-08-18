import { parseDate } from './csv-parser.js';

/** @typedef {'rule' | 'point'} AnnotationDataType */
/** @typedef {'top-left' | 'top' | 'top-right' | 'left' | 'right' | 'bottom-left' | 'bottom' | 'bottom-right'} AnnotationLabelPosition */

/**
 * @typedef {Object} AnnotationItem
 * @property {string} id
 * @property {AnnotationDataType | ''} type
 * @property {'data' | 'custom'} xSource
 * @property {string} x
 * @property {string} label
 * @property {'y' | 'series'} positionBy
 * @property {string} y
 * @property {string | null} series
 * @property {'left' | 'right'} axis
 * @property {AnnotationLabelPosition} [labelPosition]
 * @property {AnnotationStyleConfig} [appearance]
 */

/**
 * @typedef {Object} AnnotationStyleConfig
 * @property {string} ruleColour
 * @property {string} pointColour
 * @property {string} labelColour
 * @property {'solid' | 'dashed' | 'dotted'} lineStyle
 * @property {number} lineWidth
 * @property {number} fontSize
 * @property {'normal' | 'bold'} fontWeight
 * @property {number} pointRadius
 * @property {number} labelMaxWidth
 * @property {string} labelBackgroundColour
 * @property {number} labelBackgroundOpacity
 */

/**
 * @typedef {Object} DataAnnotation
 * @property {AnnotationDataType} type
 * @property {Date | number | string} x
 * @property {string} rawX
 * @property {string} text
 * @property {string} colour
 * @property {string} labelColour
 * @property {number | null} y
 * @property {string | null} series
 * @property {'left' | 'right'} axis
 * @property {AnnotationLabelPosition} [labelPosition]
 * @property {string} [id]
 * @property {number} rowNumber
 * @property {AnnotationStyleConfig} [style]
 */

export const DEFAULT_ANNOTATION_STYLE = /** @type {AnnotationStyleConfig} */ ({
	ruleColour: '#666666',
	pointColour: '#666666',
	labelColour: '#353535',
	lineStyle: 'dashed',
	lineWidth: 1,
	fontSize: 12,
	fontWeight: 'normal',
	pointRadius: 6,
	labelMaxWidth: 180,
	labelBackgroundColour: '#fff',
	labelBackgroundOpacity: 0.85
});

/**
 * @param {AnnotationStyleConfig} [appearance]
 * @returns {AnnotationItem}
 */
export function createAnnotationItem(appearance = DEFAULT_ANNOTATION_STYLE) {
	return {
		id: globalThis.crypto?.randomUUID?.() ?? `annotation-${Date.now()}-${Math.random()}`,
		type: '',
		xSource: 'data',
		x: '',
		label: '',
		positionBy: 'y',
		y: '',
		series: null,
		axis: 'left',
		labelPosition: 'top',
		appearance: { ...DEFAULT_ANNOTATION_STYLE, ...appearance }
	};
}

/** @param {string} value */
export function isValidAnnotationColour(value) {
	const trimmed = value.trim();
	return (
		/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed) ||
		/^rgba?\(\s*[\d.%]+\s*,\s*[\d.%]+\s*,\s*[\d.%]+(?:\s*,\s*[\d.%]+)?\s*\)$/i.test(trimmed) ||
		/^hsla?\(.+\)$/i.test(trimmed) ||
		/^[a-z]+$/i.test(trimmed)
	);
}

/**
 * Compile the guided annotation items for the current chart mode.
 * @param {AnnotationItem[]} items
 * @param {'time-series' | 'category' | 'linear'} mode
 * @param {AnnotationStyleConfig} style
 */
export function compileAnnotationItems(items, mode, style) {
	/** @type {DataAnnotation[]} */
	const annotations = [];
	/** @type {string[]} */
	const errors = [];
	/** @type {string[]} */
	const warnings = [];

	for (let index = 0; index < items.length; index++) {
		const item = items[index];
		const itemNumber = index + 1;
		if (item.type === '') continue;
		if (item.type !== 'rule' && item.type !== 'point') {
			errors.push(`Annotation ${itemNumber}: invalid type.`);
			continue;
		}

		const rawX = item.x.trim();
		const label = item.label.trim();
		if (!rawX || !label) {
			continue;
		}

		/** @type {Date | number | string | null} */
		let x = rawX;
		if (mode === 'time-series') x = parseDate(rawX);
		if (mode === 'linear') {
			const parsed = Number(rawX.replace(/,/g, ''));
			x = Number.isFinite(parsed) ? parsed : null;
		}
		if (x == null) {
			errors.push(`Annotation ${itemNumber}: could not parse X value "${rawX}".`);
			continue;
		}

		const colourKey = item.type === 'rule' ? 'ruleColour' : 'pointColour';
		const appearance = { ...style, ...(item.appearance ?? {}) };
		const colour = isValidAnnotationColour(appearance[colourKey])
			? appearance[colourKey]
			: DEFAULT_ANNOTATION_STYLE[colourKey];
		const labelColour = isValidAnnotationColour(appearance.labelColour)
			? appearance.labelColour
			: DEFAULT_ANNOTATION_STYLE.labelColour;
		const labelBackgroundColour = isValidAnnotationColour(appearance.labelBackgroundColour)
			? appearance.labelBackgroundColour
			: DEFAULT_ANNOTATION_STYLE.labelBackgroundColour;

		let y = null;
		let series = null;
		if (item.type === 'point' && item.positionBy === 'y') {
			const rawY = item.y.trim();
			const parsedY = rawY ? Number(rawY.replace(/,/g, '')) : NaN;
			if (!Number.isFinite(parsedY)) {
				errors.push(`Annotation ${itemNumber}: enter a numeric Y value.`);
				continue;
			}
			y = parsedY;
		}
		if (item.type === 'point' && item.positionBy === 'series') {
			series = item.series?.trim() || null;
			if (!series) {
				errors.push(`Annotation ${itemNumber}: choose a series.`);
				continue;
			}
		}

		annotations.push({
			id: item.id,
			type: item.type,
			x,
			rawX,
			text: label,
			colour,
			labelColour,
			y,
			series,
			axis: item.axis,
			labelPosition: item.labelPosition ?? 'top',
			rowNumber: itemNumber,
			style: { ...appearance, labelBackgroundColour }
		});
	}

	return { annotations, errors, warnings };
}
