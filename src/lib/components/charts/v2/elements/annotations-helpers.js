/**
 * Helper utilities for the Annotations component.
 * Extracted for testability — the component delegates to these.
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
 * @param {import('./Annotations.svelte').AnnotationRect} item
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
 * @param {import('./Annotations.svelte').AnnotationCircle} item
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
 * @param {import('./Annotations.svelte').AnnotationLine} item
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
 * @param {import('./Annotations.svelte').AnnotationText} item
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
 * @param {import('./Annotations.svelte').AnnotationText} item
 * @param {number} xPx - Computed x pixel position (including dx)
 * @param {number} yPx - Computed y pixel position (including dy)
 * @returns {string | undefined}
 */
export function textTransform(item, xPx, yPx) {
	if (!item.rotate) return undefined;
	return `rotate(${item.rotate}, ${xPx}, ${yPx})`;
}
