/**
 * Builder-side normalisation of stored charts and snapshots.
 *
 * `normaliseSnapshot()` is the single definition of what the builder loads
 * from a chart document, an imported file or a template: registry defaults
 * plus the legacy migrations. `StratifyPlotProject.loadFromSnapshot()`
 * assigns its result, and the save session uses it to read a server chart
 * in exactly the shape the builder would, so the two compare field for
 * field.
 */

import { CHART_FIELDS, withChartDefaults } from '$lib/stratify/chart-fields.js';
import { migratePreset } from '$lib/stratify/chart-styles.js';
import { migratePresetToPalette } from '$lib/stratify/colour-palettes.js';
import { migrateChartType } from '$lib/stratify/chart-types.js';
import { DEFAULT_ANNOTATION_STYLE } from '$lib/stratify/annotation-data.js';

/**
 * Registry fields the builder holds as project state. `version` is fixed by
 * `toJSON()` and `publishedAt` lives only on the server.
 */
export const PROJECT_FIELD_KEYS = CHART_FIELDS.map((field) => field.key).filter(
	(key) => key !== 'version' && key !== 'publishedAt'
);

/**
 * @param {Record<string, any>} raw - Decoded chart document or snapshot
 * @returns {Record<string, any>} Every registry field, defaulted and migrated
 */
export function normaliseSnapshot(raw) {
	const values = withChartDefaults(raw);
	return {
		...values,
		annotationItems: Array.isArray(raw.annotationItems) ? raw.annotationItems : [],
		annotationStyle: { ...DEFAULT_ANNOTATION_STYLE, ...(raw.annotationStyle ?? {}) },
		annotations: Array.isArray(raw.annotations) ? raw.annotations : [],
		chartType: migrateChartType(values.chartType),
		stylePreset: migratePreset(values.stylePreset),
		colourPalette: raw.colourPalette ?? migratePresetToPalette(raw.stylePreset ?? 'oe')
	};
}
