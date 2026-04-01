/**
 * Observable Plot override system.
 *
 * Allows power users to layer arbitrary Observable Plot configuration on top
 * of the factory-generated options. Supports scale overrides, layout properties,
 * declarative extra marks, and default curve.
 */
import * as Plot from '@observablehq/plot';

// ── Types ───────────────────────────────────────────────────────

/**
 * @typedef {Object} PlotLayoutOverride
 * @property {string} [title]
 * @property {string} [subtitle]
 * @property {string} [caption]
 * @property {number} [marginTop]
 * @property {number} [marginRight]
 * @property {number} [marginBottom]
 * @property {number} [marginLeft]
 * @property {number} [insetTop]
 * @property {number} [insetRight]
 * @property {number} [insetBottom]
 * @property {number} [insetLeft]
 * @property {number} [width]
 * @property {number} [height]
 */

/**
 * Declarative mark specification. Fully serialisable (no function refs).
 * @typedef {Object} PlotMarkSpec
 * @property {string} markType - e.g. 'dot', 'rule-y', 'text', 'bar-y', etc.
 * @property {Record<string, any>} [channels] - Mark channel mappings (x, y, fill, stroke, r, text, etc.)
 * @property {Record<string, any>} [options] - Additional mark options (strokeWidth, dx, dy, etc.)
 * @property {any[]} [data] - Inline data for the mark (defaults to empty array for standalone marks like ruleY)
 */

/**
 * @typedef {Object} PlotOverrides
 * @property {Record<string, any>} [x] - x-scale overrides
 * @property {Record<string, any>} [y] - y-scale overrides
 * @property {Record<string, any>} [color] - colour scale overrides
 * @property {Record<string, any>} [r] - radius scale overrides
 * @property {Record<string, any>} [opacity] - opacity scale overrides
 * @property {Record<string, any>} [fx] - facet-x overrides
 * @property {Record<string, any>} [fy] - facet-y overrides
 * @property {PlotLayoutOverride} [layout] - title, subtitle, caption, margins, insets
 * @property {PlotMarkSpec[]} [extraMarks] - declarative additional marks
 * @property {string} [curve] - default curve for all marks
 */

// ── Mark Constructor Map ────────────────────────────────────────

/** @type {Record<string, Function>} */
const MARK_CONSTRUCTORS = {
	// Dot
	dot: Plot.dot,
	'dot-x': Plot.dotX,
	'dot-y': Plot.dotY,
	// Line
	line: Plot.line,
	'line-x': Plot.lineX,
	'line-y': Plot.lineY,
	// Area
	area: Plot.area,
	'area-x': Plot.areaX,
	'area-y': Plot.areaY,
	// Bar
	'bar-x': Plot.barX,
	'bar-y': Plot.barY,
	// Rect
	rect: Plot.rect,
	'rect-x': Plot.rectX,
	'rect-y': Plot.rectY,
	// Cell
	cell: Plot.cell,
	'cell-x': Plot.cellX,
	// Text
	text: Plot.text,
	'text-x': Plot.textX,
	'text-y': Plot.textY,
	// Rule
	'rule-x': Plot.ruleX,
	'rule-y': Plot.ruleY,
	// Tick
	'tick-x': Plot.tickX,
	'tick-y': Plot.tickY,
	// Others
	frame: Plot.frame,
	arrow: Plot.arrow,
	vector: Plot.vector,
	link: Plot.link,
	image: Plot.image,
	'waffle-x': Plot.waffleX,
	'waffle-y': Plot.waffleY
};

// ── Public API ──────────────────────────────────────────────────

/**
 * Convert a declarative mark spec into an Observable Plot mark.
 * Returns null for unknown mark types.
 *
 * @param {PlotMarkSpec} spec
 * @returns {any | null} Observable Plot mark, or null if markType is unknown
 */
export function resolveMarkSpec(spec) {
	const ctor = MARK_CONSTRUCTORS[spec.markType];
	if (!ctor) return null;

	const opts = { ...(spec.channels || {}), ...(spec.options || {}) };

	// Standalone marks (frame, rule-y with value, etc.) may not need data
	if (spec.data) {
		return ctor(spec.data, opts);
	}

	// Some marks like frame() take no data at all
	if (spec.markType === 'frame') {
		return ctor(opts);
	}

	// For rule marks with inline values, pass data as array
	return ctor([], opts);
}

/**
 * Merge PlotOverrides into a PlotOptions object.
 *
 * Scale configs (x, y, color, r, opacity, fx, fy) are shallow-merged.
 * Layout properties are applied at top level.
 * Extra marks are resolved from their declarative specs and appended.
 *
 * @param {import('@observablehq/plot').PlotOptions} baseOptions
 * @param {PlotOverrides | null | undefined} overrides
 * @returns {import('@observablehq/plot').PlotOptions}
 */
export function applyPlotOverrides(baseOptions, overrides) {
	if (!overrides) return baseOptions;

	const result = { ...baseOptions };

	// Scale overrides
	const scaleKeys = /** @type {const} */ (['x', 'y', 'color', 'r', 'opacity', 'fx', 'fy']);
	for (const key of scaleKeys) {
		if (overrides[key]) {
			result[key] = { ...(result[key] || {}), ...overrides[key] };
		}
	}

	// Layout overrides
	if (overrides.layout) {
		const layoutKeys = /** @type {const} */ ([
			'title',
			'subtitle',
			'caption',
			'marginTop',
			'marginRight',
			'marginBottom',
			'marginLeft',
			'insetTop',
			'insetRight',
			'insetBottom',
			'insetLeft',
			'width',
			'height'
		]);
		for (const key of layoutKeys) {
			if (overrides.layout[key] !== undefined) {
				result[key] = overrides.layout[key];
			}
		}
	}

	// Extra marks — resolve from specs and append
	if (overrides.extraMarks && overrides.extraMarks.length > 0) {
		const resolvedMarks = overrides.extraMarks.map(resolveMarkSpec).filter((m) => m !== null);
		if (resolvedMarks.length > 0) {
			result.marks = [...(result.marks || []), ...resolvedMarks];
		}
	}

	return result;
}
