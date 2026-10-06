/**
 * Registry of every persisted Stratify chart field.
 *
 * One table drives how a chart snapshot (`StratifyPlotProject.toJSON()`) is
 * written to and read from its Sanity `stratifyChart` document, and how two
 * snapshots are compared field by field. The API routes, `normaliseChart()`
 * and the change log all read from here, so a new chart setting is added in
 * one place (plus the project state class).
 *
 * This module is a leaf: it imports nothing, so both the server routes and
 * `chart-data.js` can depend on it.
 */

/**
 * @typedef {'data' | 'text' | 'chart' | 'series' | 'axes' | 'annotations' | 'map' | 'meta'} ChartFieldGroup
 */

/**
 * @typedef {Object} ChartField
 * @property {string} key - Snapshot and API key
 * @property {string} label - Human label for change logs and conflict prompts
 * @property {ChartFieldGroup} group
 * @property {any} default - Value for a new chart or one saved before the field existed
 * @property {'raw' | 'json'} [encoding] - `json` fields are stored in Sanity as JSON strings (default `raw`)
 * @property {string} [docKey] - Sanity field name, when it differs from `key`
 */

/**
 * @typedef {Object} ChartFieldChange
 * @property {string} field - Registry key
 * @property {any} before
 * @property {any} after
 */

/**
 * @typedef {Object} ChartFieldConflict
 * @property {string} field - Registry key
 * @property {any} base
 * @property {any} mine
 * @property {any} theirs
 */

/** @type {readonly ChartField[]} */
export const CHART_FIELDS = Object.freeze([
	// --- Data ---
	{ key: 'csvText', label: 'Data', group: 'data', default: '' },
	{ key: 'xColumn', label: 'X column', group: 'data', default: '' },
	{ key: 'dataTransform', label: 'Data transform', group: 'data', default: 'none' },
	{ key: 'categorySort', label: 'Category sort', group: 'data', default: 'default' },

	// --- Text ---
	{ key: 'title', label: 'Title', group: 'text', default: '' },
	{ key: 'description', label: 'Description', group: 'text', default: '' },
	{ key: 'dataSource', label: 'Data source', group: 'text', default: '' },
	{ key: 'notes', label: 'Notes', group: 'text', default: '' },

	// --- Annotations ---
	{
		key: 'annotationItems',
		label: 'Annotations',
		group: 'annotations',
		default: [],
		encoding: 'json'
	},
	{
		key: 'annotationStyle',
		label: 'Annotation style',
		group: 'annotations',
		default: {},
		encoding: 'json'
	},
	{
		key: 'annotations',
		label: 'Plot annotations',
		group: 'annotations',
		default: [],
		encoding: 'json'
	},

	// --- Chart ---
	{ key: 'chartType', label: 'Chart type', group: 'chart', default: 'line' },
	{ key: 'displayMode', label: 'Display mode', group: 'chart', default: 'auto' },
	{ key: 'stylePreset', label: 'Style preset', group: 'chart', default: 'sans' },
	{ key: 'colourPalette', label: 'Colour palette', group: 'chart', default: 'oe-energy' },
	{
		key: 'plotOverrides',
		label: 'Plot overrides',
		group: 'chart',
		default: null,
		encoding: 'json'
	},
	{ key: 'chartHeight', label: 'Chart height', group: 'chart', default: 250 },
	{ key: 'chartCurve', label: 'Line curve', group: 'chart', default: 'linear' },
	{ key: 'valueFormat', label: 'Value format', group: 'chart', default: '1' },
	{ key: 'chartBorderWidth', label: 'Border width', group: 'chart', default: 0.5 },
	{ key: 'chartBorderColour', label: 'Border colour', group: 'chart', default: '#000000' },
	{ key: 'showLegend', label: 'Legend', group: 'chart', default: true },
	{ key: 'showBranding', label: 'Branding', group: 'chart', default: true },
	{ key: 'tooltipColumns', label: 'Tooltip columns', group: 'chart', default: [] },
	{ key: 'tooltipDateFormat', label: 'Tooltip date format', group: 'chart', default: 'date' },
	{ key: 'facetColumn', label: 'Facet column', group: 'chart', default: null },
	{ key: 'facetPanelsPerRow', label: 'Facet panels per row', group: 'chart', default: 0 },
	{ key: 'animateAsOneChart', label: 'Animate as one chart', group: 'chart', default: false },
	{ key: 'animationSpeedMs', label: 'Animation speed', group: 'chart', default: 800 },
	{ key: 'animationAutoLoop', label: 'Animation loop', group: 'chart', default: false },
	{ key: 'animationAutoPlay', label: 'Animation autoplay', group: 'chart', default: false },
	{ key: 'animationTween', label: 'Animation tweening', group: 'chart', default: true },
	{ key: 'lineRangeMinColumn', label: 'Range minimum column', group: 'chart', default: null },
	{ key: 'lineRangeMaxColumn', label: 'Range maximum column', group: 'chart', default: null },
	{ key: 'lineRangeOpacity', label: 'Range opacity', group: 'chart', default: 0.2 },
	{ key: 'scatterSizeColumn', label: 'Point size column', group: 'chart', default: null },
	{ key: 'scatterPointRadius', label: 'Point radius', group: 'chart', default: 4 },
	{ key: 'scatterMinRadius', label: 'Point minimum radius', group: 'chart', default: 3 },
	{ key: 'scatterMaxRadius', label: 'Point maximum radius', group: 'chart', default: 18 },
	{ key: 'scatterPointOpacity', label: 'Point opacity', group: 'chart', default: 0.7 },
	{ key: 'waterfallMode', label: 'Waterfall mode', group: 'chart', default: 'single' },
	{ key: 'waterfallShowTotal', label: 'Waterfall total', group: 'chart', default: true },
	{
		key: 'waterfallColourMode',
		label: 'Waterfall colours',
		group: 'chart',
		default: 'semantic'
	},

	// --- Series ---
	{ key: 'hiddenSeries', label: 'Hidden series', group: 'series', default: [] },
	{ key: 'seriesOrder', label: 'Series order', group: 'series', default: [] },
	{ key: 'colourSeries', label: 'Colour series', group: 'series', default: null },
	{
		key: 'userSeriesColours',
		label: 'Series colours',
		group: 'series',
		default: {},
		encoding: 'json'
	},
	{
		key: 'userSeriesLabels',
		label: 'Series labels',
		group: 'series',
		default: {},
		encoding: 'json'
	},
	{
		key: 'seriesChartTypes',
		label: 'Series chart types',
		group: 'series',
		default: {},
		encoding: 'json'
	},
	{
		key: 'seriesLineStyles',
		label: 'Series line styles',
		group: 'series',
		default: {},
		encoding: 'json'
	},
	{
		key: 'seriesYAxis',
		label: 'Series axes',
		group: 'series',
		default: {},
		encoding: 'json'
	},

	// --- Axes ---
	{ key: 'xLabel', label: 'X axis label', group: 'axes', default: '' },
	{ key: 'showXTickLabels', label: 'X tick labels', group: 'axes', default: true },
	{ key: 'xTicks', label: 'X ticks', group: 'axes', default: 0 },
	{ key: 'xTickRotate', label: 'X tick rotation', group: 'axes', default: 0 },
	{ key: 'marginBottom', label: 'Bottom margin', group: 'axes', default: 0 },
	{ key: 'marginLeft', label: 'Left margin', group: 'axes', default: 0 },
	{ key: 'yLabel', label: 'Y axis label', group: 'axes', default: '' },
	{ key: 'yTicks', label: 'Y ticks', group: 'axes', default: 0 },
	{ key: 'yMinMax', label: 'Y range', group: 'axes', default: false },
	{ key: 'y1Min', label: 'Y minimum', group: 'axes', default: null },
	{ key: 'y1Max', label: 'Y maximum', group: 'axes', default: null },
	{ key: 'y2Label', label: 'Right Y axis label', group: 'axes', default: '' },
	{ key: 'y2Ticks', label: 'Right Y ticks', group: 'axes', default: 0 },
	{ key: 'y2MinMax', label: 'Right Y range', group: 'axes', default: false },
	{ key: 'y2Min', label: 'Right Y minimum', group: 'axes', default: null },
	{ key: 'y2Max', label: 'Right Y maximum', group: 'axes', default: null },

	// --- Map ---
	{ key: 'latColumn', label: 'Latitude column', group: 'map', default: null },
	{ key: 'lngColumn', label: 'Longitude column', group: 'map', default: null },
	{ key: 'labelColumn', label: 'Label column', group: 'map', default: null },
	{ key: 'sizeColumn', label: 'Marker size column', group: 'map', default: null },
	{ key: 'mapColourMode', label: 'Marker colour mode', group: 'map', default: 'single' },
	{ key: 'colourColumn', label: 'Marker colour column', group: 'map', default: null },
	{ key: 'singleMarkerColour', label: 'Marker colour', group: 'map', default: '#3b82f6' },
	{ key: 'mapRangeMinColour', label: 'Range start colour', group: 'map', default: '#dbeafe' },
	{ key: 'mapRangeMaxColour', label: 'Range end colour', group: 'map', default: '#1e3a8a' },
	{ key: 'mapMinRadius', label: 'Marker minimum radius', group: 'map', default: 4 },
	{ key: 'mapMaxRadius', label: 'Marker maximum radius', group: 'map', default: 24 },
	{ key: 'mapTheme', label: 'Map theme', group: 'map', default: 'light' },

	// --- Meta (not chart settings; set by the builder or the publish flow) ---
	{ key: 'version', label: 'Format version', group: 'meta', default: 1, docKey: 'snapshotVersion' },
	{ key: 'status', label: 'Status', group: 'meta', default: 'draft' },
	{ key: 'publishedAt', label: 'Published at', group: 'meta', default: null }
]);

const FIELDS_BY_KEY = new Map(CHART_FIELDS.map((field) => [field.key, field]));

/**
 * Look up a field by its snapshot key.
 * @param {string} key
 * @returns {ChartField | undefined}
 */
export function getChartField(key) {
	return FIELDS_BY_KEY.get(key);
}

/**
 * A fresh copy of a field's default, so callers never share a mutable
 * array or object.
 * @param {ChartField} field
 */
export function chartFieldDefault(field) {
	return structuredClone(field.default);
}

/**
 * Fill every registry field, replacing missing or null values with the
 * field's default. Keys outside the registry are dropped.
 * @param {Record<string, any>} values
 * @returns {Record<string, any>}
 */
export function withChartDefaults(values) {
	/** @type {Record<string, any>} */
	const result = {};
	for (const field of CHART_FIELDS) {
		result[field.key] = values[field.key] ?? chartFieldDefault(field);
	}
	return result;
}

/**
 * Convert snapshot values to Sanity document fields: JSON-encode `json`
 * fields and rename to `docKey`. Undefined values and keys outside the
 * registry are dropped; null and other falsy values are kept.
 * @param {Record<string, any>} values
 * @returns {Record<string, any>}
 */
export function encodeChartFields(values) {
	/** @type {Record<string, any>} */
	const doc = {};
	for (const field of CHART_FIELDS) {
		const value = values[field.key];
		if (value === undefined) continue;
		doc[field.docKey ?? field.key] = field.encoding === 'json' ? JSON.stringify(value) : value;
	}
	return doc;
}

/**
 * Structural equality for snapshot values (JSON-shaped data). Object key
 * order is ignored; array order is not.
 * @param {any} a
 * @param {any} b
 * @returns {boolean}
 */
export function isSameFieldValue(a, b) {
	if (a === b) return true;
	if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
	if (Array.isArray(a) !== Array.isArray(b)) return false;

	if (Array.isArray(a)) {
		return a.length === b.length && a.every((item, i) => isSameFieldValue(item, b[i]));
	}

	const keysA = Object.keys(a).filter((key) => a[key] !== undefined);
	const keysB = Object.keys(b).filter((key) => b[key] !== undefined);
	return (
		keysA.length === keysB.length &&
		keysA.every((key) => Object.hasOwn(b, key) && isSameFieldValue(a[key], b[key]))
	);
}

/**
 * List the registry fields whose values differ between two snapshots, in
 * registry order. Keys outside the registry are ignored.
 * @param {Record<string, any>} before
 * @param {Record<string, any>} after
 * @returns {ChartFieldChange[]}
 */
export function diffSnapshots(before, after) {
	/** @type {ChartFieldChange[]} */
	const changes = [];
	for (const { key } of CHART_FIELDS) {
		if (!isSameFieldValue(before[key], after[key])) {
			changes.push({ field: key, before: before[key], after: after[key] });
		}
	}
	return changes;
}

/**
 * Three-way merge of two snapshots that both started from `base`.
 *
 * Per registry field: a field only one side changed takes that side's
 * value; a field both sides changed to the same value merges cleanly; a
 * field both sides changed to different values is a conflict. Conflicting
 * fields keep `mine` in `merged` until the caller resolves them. Keys
 * outside the registry are taken from `mine`.
 * @param {Record<string, any>} base
 * @param {Record<string, any>} mine
 * @param {Record<string, any>} theirs
 * @returns {{ merged: Record<string, any>, conflicts: ChartFieldConflict[] }}
 */
export function mergeFields(base, mine, theirs) {
	const merged = { ...mine };
	/** @type {ChartFieldConflict[]} */
	const conflicts = [];

	for (const { key } of CHART_FIELDS) {
		const mineChanged = !isSameFieldValue(base[key], mine[key]);
		const theirsChanged = !isSameFieldValue(base[key], theirs[key]);
		if (!theirsChanged) continue;

		if (!mineChanged) {
			merged[key] = theirs[key];
		} else if (!isSameFieldValue(mine[key], theirs[key])) {
			conflicts.push({ field: key, base: base[key], mine: mine[key], theirs: theirs[key] });
		}
	}

	return { merged, conflicts };
}
