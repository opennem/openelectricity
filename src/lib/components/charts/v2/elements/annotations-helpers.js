/**
 * Helper utilities for the Annotations component.
 * Extracted for testability — the component delegates to these.
 */

/**
 * @typedef {Object} AnnotationRect
 * @property {'rect'} type
 * @property {Date | number} x - X position in data coordinates
 * @property {number} y - Y position in data coordinates
 * @property {number} width - Width in pixels
 * @property {number} height - Height in pixels
 * @property {string} [fill] - Fill colour
 * @property {string} [stroke] - Stroke colour
 * @property {number} [strokeWidth] - Stroke width
 * @property {number} [opacity] - Opacity
 * @property {number} [rx] - Corner radius
 */

/**
 * @typedef {Object} AnnotationCircle
 * @property {'circle'} type
 * @property {Date | number} x - Centre X in data coordinates
 * @property {number} y - Centre Y in data coordinates
 * @property {number} r - Radius in pixels
 * @property {string} [fill] - Fill colour
 * @property {string} [stroke] - Stroke colour
 * @property {number} [strokeWidth] - Stroke width
 * @property {number} [opacity] - Opacity
 */

/**
 * @typedef {Object} AnnotationLine
 * @property {'line'} type
 * @property {Date | number} x1 - Start X in data coordinates
 * @property {number} y1 - Start Y in data coordinates
 * @property {Date | number} x2 - End X in data coordinates
 * @property {number} y2 - End Y in data coordinates
 * @property {string} [stroke] - Stroke colour
 * @property {number} [strokeWidth] - Stroke width
 * @property {string} [strokeDasharray] - Dash pattern
 * @property {number} [opacity] - Opacity
 */

/**
 * @typedef {Object} AnnotationText
 * @property {'text'} type
 * @property {Date | number} x - X position in data coordinates
 * @property {number} y - Y position in data coordinates
 * @property {string} text - Text content
 * @property {number} [dx] - Horizontal offset in pixels
 * @property {number} [dy] - Vertical offset in pixels
 * @property {number} [rotate] - Rotation angle in degrees
 * @property {string} [fill] - Text fill colour
 * @property {string} [fontSize] - Font size (e.g. '12px')
 * @property {string} [fontWeight] - Font weight
 * @property {string} [textAnchor] - Text anchor: 'start', 'middle', 'end'
 * @property {string} [dominantBaseline] - Baseline alignment
 * @property {number} [opacity] - Opacity
 */

/**
 * @typedef {AnnotationRect | AnnotationCircle | AnnotationLine | AnnotationText} Annotation
 */

/**
 * Convert a data x value (Date or number) to a Date for scale input.
 * @param {Date | number} val
 * @returns {Date}
 */
export function toDateValue(val) {
	return val instanceof Date ? val : new Date(val);
}

/**
 * Resolve annotation defaults for a rect.
 * @param {AnnotationRect} item
 */
export function rectDefaults(item) {
	return {
		fill: item.fill ?? 'none',
		stroke: item.stroke ?? 'none',
		strokeWidth: item.strokeWidth ?? 1,
		opacity: item.opacity ?? 1,
		rx: item.rx ?? 0
	};
}

/**
 * Resolve annotation defaults for a circle.
 * @param {AnnotationCircle} item
 */
export function circleDefaults(item) {
	return {
		fill: item.fill ?? 'none',
		stroke: item.stroke ?? 'none',
		strokeWidth: item.strokeWidth ?? 1,
		opacity: item.opacity ?? 1
	};
}

/**
 * Resolve annotation defaults for a line.
 * @param {AnnotationLine} item
 */
export function lineDefaults(item) {
	return {
		stroke: item.stroke ?? '#666',
		strokeWidth: item.strokeWidth ?? 1,
		strokeDasharray: item.strokeDasharray ?? 'none',
		opacity: item.opacity ?? 1
	};
}

/**
 * Resolve annotation defaults for text.
 * @param {AnnotationText} item
 */
export function textDefaults(item) {
	return {
		dx: item.dx ?? 0,
		dy: item.dy ?? 0,
		fill: item.fill ?? '#333',
		fontSize: item.fontSize ?? '12px',
		fontWeight: item.fontWeight ?? 'normal',
		textAnchor: item.textAnchor ?? 'start',
		dominantBaseline: item.dominantBaseline ?? 'auto',
		opacity: item.opacity ?? 1
	};
}

/**
 * Build the SVG transform string for rotated text.
 * @param {AnnotationText} item
 * @param {number} xPx - Computed x pixel position (including dx)
 * @param {number} yPx - Computed y pixel position (including dy)
 * @returns {string | undefined}
 */
export function textTransform(item, xPx, yPx) {
	if (!item.rotate) return undefined;
	return `rotate(${item.rotate}, ${xPx}, ${yPx})`;
}
