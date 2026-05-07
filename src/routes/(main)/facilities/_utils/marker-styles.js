/**
 * Source of truth for the facilities map's marker-style picker. The Layers
 * menu, the tuning panel, the URL `?markers=` param and `+page.svelte`'s
 * state machine all read from `MARKER_STYLES`.
 *
 * @typedef {'circles' | 'columns' | 'heatmap'} MarkerStyle
 */

/** @type {Array<{ value: MarkerStyle, label: string }>} */
export const MARKER_STYLES = [
	{ value: 'circles', label: 'Circles' },
	{ value: 'columns', label: 'Columns' },
	{ value: 'heatmap', label: 'Heat' }
];

/** @type {MarkerStyle[]} */
export const MARKER_STYLE_VALUES = MARKER_STYLES.map((s) => s.value);
