import {
	MAX_COMPARISON_FACILITIES,
	MAX_EXPLORE_CHARTS,
	RECIPE_IDS,
	exploreRecipeSupportsScope,
	validateExploreConfig
} from './explore-model.js';
import {
	getIntervalSpec,
	getIntervalOptionsForDays,
	getIntervalsForRange,
	getPresetByDays
} from '$lib/components/charts/facility/range-interval-config.js';
import { GROUP_OPTIONS } from '$lib/components/charts/network/groups.js';
import { TRACKER_REGION_OPTIONS } from '../tracker-regions.js';

export const TRACKER_VIEW_SCHEMA_URL =
	'https://openelectricity.org.au/schemas/tracker-view-v1.schema.json';
export const TRACKER_VIEW_KIND = 'tracker-view';
export const TRACKER_VIEW_VERSION = 1;
export const TRACKER_VIEW_NAME_MAX = 80;
export const TRACKER_VIEW_DESCRIPTION_MAX = 280;
export const TRACKER_VIEW_MIN_HEIGHT = 240;
export const TRACKER_VIEW_MAX_HEIGHT = 720;
export const DEFAULT_TRACKER_VIEW_ID = 'default';
export const DEFAULT_TRACKER_VIEW_NAME = 'Overview';
export const DEFAULT_TRACKER_VIEW_DESCRIPTION =
	'Generation, emissions and spot prices over the past 7 days.';

const COMMON_QUERY_KEYS = ['scope', 'range', 'group'];
const SHARED_CONTROL_KEYS = ['scope', 'range', 'group', 'hiddenFuelTechGroups'];
/** @type {Record<string, string[]>} */
const RECIPE_QUERY_KEYS = {
	generation: [],
	demand: ['demand'],
	price: [],
	emissions: ['emissionsMode'],
	'market-value': [],
	renewables: ['renewableMeasure', 'includeStorage'],
	curtailment: ['curtailmentSource'],
	flows: [],
	facility: ['networkId', 'facilityCodes', 'unitCodes'],
	'facility-comparison': ['networkId', 'facilityCodes', 'unitCodes']
};

/** @param {unknown} value @returns {value is Record<string, any>} */
function isRecord(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** @param {'shared'|'individual'} [mode] @returns {any} */
export function createDefaultTrackerControls(mode = 'shared') {
	return {
		mode: mode === 'individual' ? 'individual' : 'shared',
		shared: {
			scope: '_all',
			range: { kind: 'preset', days: 7, intervalId: '30m' },
			group: 'simple',
			hiddenFuelTechGroups: []
		}
	};
}

/** @param {unknown} value */
function normaliseSharedRange(value) {
	if (isRecord(value) && value.kind === 'custom') {
		const start = typeof value.start === 'string' ? value.start : '';
		const end = typeof value.end === 'string' ? value.end : '';
		const startMs = Date.parse(start);
		const endMs = Date.parse(end);
		if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs) {
			return {
				kind: 'custom',
				start: new Date(startMs).toISOString(),
				end: new Date(endMs).toISOString(),
				intervalId: String(value.intervalId || '30m')
			};
		}
	}
	if (isRecord(value) && value.kind === 'preset') {
		const days = [1, 3, 7, 30, 365, -1].includes(Number(value.days)) ? Number(value.days) : 7;
		return { kind: 'preset', days, intervalId: String(value.intervalId || '30m') };
	}
	return { kind: 'preset', days: 7, intervalId: '30m' };
}

/** @param {unknown} value @param {'shared'|'individual'} [fallbackMode] @returns {any} */
export function normaliseTrackerControls(value, fallbackMode = 'shared') {
	const defaults = createDefaultTrackerControls(fallbackMode);
	if (!isRecord(value) || !isRecord(value.shared)) return defaults;
	const shared = value.shared;
	return {
		mode: value.mode === 'individual' ? 'individual' : 'shared',
		shared: {
			scope: typeof shared.scope === 'string' && shared.scope ? shared.scope : '_all',
			range: normaliseSharedRange(shared.range),
			group: typeof shared.group === 'string' && shared.group ? shared.group : 'simple',
			hiddenFuelTechGroups: Array.isArray(shared.hiddenFuelTechGroups)
				? [...new Set(shared.hiddenFuelTechGroups.filter((item) => typeof item === 'string'))]
				: []
		}
	};
}

/** Seed shared controls without modifying any card query. @param {any[]} charts */
export function seedSharedControlsFromCharts(charts) {
	const first = charts[0]?.config ?? {};
	const firstNetwork =
		charts.find((/** @type {any} */ chart) => !chart.recipeId.startsWith('facility'))?.config ??
		first;
	return normaliseTrackerControls({
		mode: 'shared',
		shared: {
			scope: firstNetwork.scope ?? '_all',
			range: {
				kind: 'preset',
				days: first.range?.days ?? 7,
				intervalId: first.range?.intervalId ?? '30m'
			},
			group: firstNetwork.group ?? 'simple',
			hiddenFuelTechGroups: []
		}
	});
}

/** @param {string} recipeId @param {'chart'|'metric'} presentation */
export function defaultTrackerItemLayout(recipeId, presentation) {
	return {
		columnSpan: recipeId === 'generation' && presentation === 'chart' ? 2 : 1,
		heightPx: presentation === 'metric' ? 240 : 420
	};
}

/**
 * Create a fresh copy of the useful out-of-the-box Explore canvas. Fixed IDs
 * keep its portable JSON deterministic; a new view replaces the whole canvas,
 * so they cannot collide with another copy in the same view.
 */
export function createDefaultTrackerCharts() {
	const baseConfig = {
		presentation: 'chart',
		scope: '_all',
		range: { days: 7, intervalId: '30m' },
		group: 'simple'
	};
	const singleColumnChartLayout = { columnSpan: 1, heightPx: 420 };
	return [
		{
			instanceId: 'default-generation',
			recipeId: 'generation',
			config: { ...baseConfig, range: { ...baseConfig.range } },
			layout: { ...singleColumnChartLayout },
			unavailableErrors: []
		},
		{
			instanceId: 'default-emissions-volume',
			recipeId: 'emissions',
			config: {
				...baseConfig,
				range: { ...baseConfig.range },
				emissionsMode: 'volume'
			},
			layout: { ...singleColumnChartLayout },
			unavailableErrors: []
		},
		{
			instanceId: 'default-emissions-intensity',
			recipeId: 'emissions',
			config: {
				...baseConfig,
				range: { ...baseConfig.range },
				emissionsMode: 'intensity'
			},
			layout: { ...singleColumnChartLayout },
			unavailableErrors: []
		},
		{
			instanceId: 'default-price',
			recipeId: 'price',
			config: { ...baseConfig, range: { ...baseConfig.range } },
			layout: { ...singleColumnChartLayout },
			unavailableErrors: []
		}
	];
}

/** @param {unknown} value */
function validateItemLayout(value) {
	if (!isRecord(value)) return null;
	const columnSpan = Number(value.columnSpan);
	const heightPx = Number(value.heightPx);
	if (![1, 2, 3].includes(columnSpan)) return null;
	if (
		!Number.isInteger(heightPx) ||
		heightPx < TRACKER_VIEW_MIN_HEIGHT ||
		heightPx > TRACKER_VIEW_MAX_HEIGHT
	) {
		return null;
	}
	if (Object.keys(value).some((key) => !['columnSpan', 'heightPx'].includes(key))) return null;
	return { columnSpan, heightPx };
}

/** @param {string} recipeId @param {Record<string, any>} query */
function unknownQueryKeys(recipeId, query) {
	const allowed = new Set([...COMMON_QUERY_KEYS, ...(RECIPE_QUERY_KEYS[recipeId] ?? [])]);
	return Object.keys(query).filter((key) => !allowed.has(key));
}

/** @param {Record<string, any>} config */
function queryFromConfig(config) {
	const { presentation: _presentation, ...query } = config;
	return JSON.parse(JSON.stringify(query));
}

/**
 * Convert the live canvas into the portable snapshot contract.
 * @param {{name:string,description?:string,columns:1|2|3,charts:any[],controls?:any}} value
 */
export function createTrackerViewSnapshot(value) {
	return {
		$schema: TRACKER_VIEW_SCHEMA_URL,
		kind: TRACKER_VIEW_KIND,
		version: TRACKER_VIEW_VERSION,
		name: value.name.trim().slice(0, TRACKER_VIEW_NAME_MAX) || 'Untitled view',
		description: (value.description ?? '').trim().slice(0, TRACKER_VIEW_DESCRIPTION_MAX),
		controls: normaliseTrackerControls(value.controls),
		layout: { columns: value.columns },
		items: value.charts.map((chart) => ({
			id: chart.instanceId,
			recipeId: chart.recipeId,
			presentation: chart.config.presentation === 'metric' ? 'metric' : 'chart',
			query: queryFromConfig(chart.config),
			layout:
				chart.layout ??
				defaultTrackerItemLayout(
					chart.recipeId,
					chart.config.presentation === 'metric' ? 'metric' : 'chart'
				)
		}))
	};
}

export function createDefaultTrackerViewSnapshot() {
	return createTrackerViewSnapshot({
		name: DEFAULT_TRACKER_VIEW_NAME,
		description: DEFAULT_TRACKER_VIEW_DESCRIPTION,
		columns: 1,
		controls: createDefaultTrackerControls(),
		charts: createDefaultTrackerCharts()
	});
}

/**
 * Validate and materialise a portable snapshot. Facility references that no
 * longer exist stay in the result as unavailable cards so they can be repaired.
 * Structural or query errors reject the complete snapshot.
 *
 * @param {unknown} value
 * @param {any[]} facilities
 * @returns {{snapshot:any|null,charts:any[],errors:string[]}}
 */
export function materialiseTrackerViewSnapshot(value, facilities = []) {
	if (!isRecord(value))
		return { snapshot: null, charts: [], errors: ['View must be a JSON object.'] };

	const errors = [];
	const validContract =
		value.version === TRACKER_VIEW_VERSION && value.$schema === TRACKER_VIEW_SCHEMA_URL;
	const hasControls = value.controls !== undefined;
	const rootKeys = [
		'$schema',
		'kind',
		'version',
		'name',
		'description',
		'controls',
		'layout',
		'items'
	];
	const unknownRoot = Object.keys(value).filter((key) => !rootKeys.includes(key));
	if (unknownRoot.length) errors.push(`Unknown view field: ${unknownRoot.join(', ')}.`);
	if (!validContract) errors.push('The tracker view schema URL is invalid.');
	if (value.kind !== TRACKER_VIEW_KIND) errors.push('The view kind must be tracker-view.');
	if (value.version !== TRACKER_VIEW_VERSION)
		errors.push(`Unsupported view version: ${String(value.version)}.`);
	let controls = createDefaultTrackerControls('individual');
	if (hasControls) {
		if (!isRecord(value.controls) || !isRecord(value.controls.shared)) {
			errors.push('View controls are invalid.');
		} else {
			const unknownControls = Object.keys(value.controls).filter(
				(key) => !['mode', 'shared'].includes(key)
			);
			const unknownShared = Object.keys(value.controls.shared).filter(
				(key) => !SHARED_CONTROL_KEYS.includes(key)
			);
			if (unknownControls.length || unknownShared.length) {
				errors.push('View controls contain an unknown field.');
			}
			if (!['shared', 'individual'].includes(value.controls.mode)) {
				errors.push('View control mode must be shared or individual.');
			}
			if (!TRACKER_REGION_OPTIONS.some((option) => option.value === value.controls.shared.scope)) {
				errors.push('The shared region is invalid.');
			}
			if (!GROUP_OPTIONS.some((option) => option.value === value.controls.shared.group)) {
				errors.push('The shared technology grouping is invalid.');
			}
			const hidden = value.controls.shared.hiddenFuelTechGroups;
			if (
				!Array.isArray(hidden) ||
				hidden.some((item) => typeof item !== 'string' || !item) ||
				new Set(hidden).size !== hidden.length
			) {
				errors.push('Hidden fuel technologies must be unique string IDs.');
			}
			const sharedRange = value.controls.shared.range;
			if (!isRecord(sharedRange) || !['preset', 'custom'].includes(sharedRange.kind)) {
				errors.push('The shared range is invalid.');
			} else if (sharedRange.kind === 'preset') {
				const preset = getPresetByDays(Number(sharedRange.days));
				const rangeKeys = Object.keys(sharedRange);
				if (
					!preset ||
					rangeKeys.some((key) => !['kind', 'days', 'intervalId'].includes(key)) ||
					!getIntervalsForRange(preset.id).options.includes(sharedRange.intervalId)
				) {
					errors.push('The shared preset range or interval is invalid.');
				}
			} else {
				const startMs = Date.parse(sharedRange.start);
				const endMs = Date.parse(sharedRange.end);
				const days = Math.max(1, Math.ceil((endMs - startMs) / 86_400_000));
				const rangeKeys = Object.keys(sharedRange);
				if (
					rangeKeys.some((key) => !['kind', 'start', 'end', 'intervalId'].includes(key)) ||
					!Number.isFinite(startMs) ||
					!Number.isFinite(endMs) ||
					endMs <= startMs ||
					!getIntervalSpec(sharedRange.intervalId) ||
					!getIntervalOptionsForDays(days).options.includes(sharedRange.intervalId)
				) {
					errors.push('The shared custom range or interval is invalid.');
				}
			}
			controls = normaliseTrackerControls(value.controls);
		}
	}
	if (
		typeof value.name !== 'string' ||
		!value.name.trim() ||
		value.name.length > TRACKER_VIEW_NAME_MAX
	) {
		errors.push(`View name must contain 1–${TRACKER_VIEW_NAME_MAX} characters.`);
	}
	if (
		typeof value.description !== 'string' ||
		value.description.length > TRACKER_VIEW_DESCRIPTION_MAX
	) {
		errors.push(
			`View description must contain at most ${TRACKER_VIEW_DESCRIPTION_MAX} characters.`
		);
	}
	if (!isRecord(value.layout) || ![1, 2, 3].includes(Number(value.layout.columns))) {
		errors.push('Layout columns must be 1, 2 or 3.');
	} else if (Object.keys(value.layout).some((key) => key !== 'columns')) {
		errors.push('Layout contains an unknown field.');
	}
	if (!Array.isArray(value.items) || value.items.length > MAX_EXPLORE_CHARTS) {
		errors.push(`Items must be an array containing at most ${MAX_EXPLORE_CHARTS} cards.`);
	}
	if (errors.length) return { snapshot: null, charts: [], errors };

	const ids = new Set();
	const charts = [];
	const items = [];
	for (let index = 0; index < value.items.length; index++) {
		const item = value.items[index];
		const path = `Item ${index + 1}`;
		if (!isRecord(item)) {
			errors.push(`${path} must be an object.`);
			continue;
		}
		const itemKeys = ['id', 'recipeId', 'presentation', 'query', 'layout'];
		const unknownItem = Object.keys(item).filter((key) => !itemKeys.includes(key));
		if (unknownItem.length) errors.push(`${path} has unknown fields: ${unknownItem.join(', ')}.`);
		const id = typeof item.id === 'string' ? item.id.trim() : '';
		if (!id || id.length > 100) errors.push(`${path} needs an ID of 1–100 characters.`);
		else if (ids.has(id)) errors.push(`${path} repeats card ID ${id}.`);
		else ids.add(id);
		const recipeId = typeof item.recipeId === 'string' ? item.recipeId : '';
		if (!RECIPE_IDS.includes(recipeId)) errors.push(`${path} has an unsupported recipe.`);
		const presentation =
			item.presentation === 'metric' ? 'metric' : item.presentation === 'chart' ? 'chart' : '';
		if (!presentation) errors.push(`${path} presentation must be chart or metric.`);
		if (!isRecord(item.query)) errors.push(`${path} query must be an object.`);
		else {
			const unknown = unknownQueryKeys(recipeId, item.query);
			if (unknown.length) errors.push(`${path} query has unknown fields: ${unknown.join(', ')}.`);
		}
		const layout = validateItemLayout(item.layout);
		if (!layout) errors.push(`${path} layout is invalid.`);
		if (!id || !RECIPE_IDS.includes(recipeId) || !presentation || !isRecord(item.query) || !layout)
			continue;

		/** @type {Record<string, any>} */
		const inputConfig = { ...item.query, presentation };
		const validated = validateExploreConfig(recipeId, inputConfig, facilities);
		const facilityRecipe = recipeId === 'facility' || recipeId === 'facility-comparison';
		/** @type {string[]} */
		let unavailableErrors = [];
		let config = validated.config;
		if (validated.errors.length) {
			if (facilityRecipe) {
				unavailableErrors = validated.errors;
				config = {
					...validated.config,
					networkId: inputConfig.networkId === 'WEM' ? 'WEM' : 'NEM',
					facilityCodes: Array.isArray(inputConfig.facilityCodes)
						? [
								...new Set(
									inputConfig.facilityCodes.filter(
										(/** @type {any} */ code) => typeof code === 'string'
									)
								)
							].slice(0, MAX_COMPARISON_FACILITIES)
						: [],
					unitCodes: Array.isArray(inputConfig.unitCodes)
						? [
								...new Set(
									inputConfig.unitCodes.filter(
										(/** @type {any} */ code) => typeof code === 'string'
									)
								)
							].slice(0, 30)
						: []
				};
			} else {
				errors.push(...validated.errors.map((error) => `${path}: ${error}`));
			}
		}
		if (!config) continue;
		charts.push({ instanceId: id, recipeId, config, layout, unavailableErrors });
		items.push({
			id,
			recipeId,
			presentation,
			query: queryFromConfig(config),
			layout
		});
	}

	if (
		hasControls &&
		controls.mode === 'shared' &&
		charts.some(
			(chart) =>
				!chart.recipeId.startsWith('facility') &&
				!exploreRecipeSupportsScope(chart.recipeId, chart.config, controls.shared.scope)
		)
	) {
		errors.push('The shared region is not compatible with every card in this view.');
	}
	if (errors.length) return { snapshot: null, charts: [], errors };
	const materialisedControls = hasControls
		? controls
		: { ...seedSharedControlsFromCharts(charts), mode: 'individual' };
	return {
		snapshot: {
			$schema: TRACKER_VIEW_SCHEMA_URL,
			kind: TRACKER_VIEW_KIND,
			version: TRACKER_VIEW_VERSION,
			name: value.name.trim(),
			description: value.description.trim(),
			controls: materialisedControls,
			layout: { columns: Number(value.layout.columns) },
			items
		},
		charts,
		errors: []
	};
}

/** @param {string} text @param {any[]} facilities */
export function parseTrackerViewJSON(text, facilities = []) {
	try {
		return materialiseTrackerViewSnapshot(JSON.parse(text), facilities);
	} catch {
		return { snapshot: null, charts: [], errors: ['Paste valid JSON before importing.'] };
	}
}

/** @param {number} configuredColumns @param {number} viewportWidth */
export function effectiveTrackerColumns(configuredColumns, viewportWidth) {
	const columns = [1, 2, 3].includes(configuredColumns) ? configuredColumns : 2;
	if (viewportWidth < 768) return 1;
	if (viewportWidth < 1280) return Math.min(columns, 2);
	return columns;
}

/** @param {any[]} charts @param {string} instanceId @param {-1|1} direction */
export function moveTrackerChart(charts, instanceId, direction) {
	const next = [...charts];
	const from = next.findIndex((chart) => chart.instanceId === instanceId);
	const to = from + direction;
	if (from < 0 || to < 0 || to >= next.length) return next;
	[next[from], next[to]] = [next[to], next[from]];
	return next;
}

/** @param {any[]} charts @param {string} instanceId @param {{columnSpan?:number,heightPx?:number}} patch */
export function updateTrackerChartLayout(charts, instanceId, patch) {
	return charts.map((chart) => {
		if (chart.instanceId !== instanceId) return chart;
		const current =
			chart.layout ?? defaultTrackerItemLayout(chart.recipeId, chart.config.presentation);
		const columnSpan = patch.columnSpan ?? current.columnSpan;
		const heightPx = Math.round(patch.heightPx ?? current.heightPx);
		return {
			...chart,
			layout: {
				columnSpan: [1, 2, 3].includes(columnSpan) ? columnSpan : current.columnSpan,
				heightPx: Math.min(TRACKER_VIEW_MAX_HEIGHT, Math.max(TRACKER_VIEW_MIN_HEIGHT, heightPx))
			}
		};
	});
}
