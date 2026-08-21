import {
	getIntervalsForRange,
	getPresetByDays
} from '$lib/components/charts/facility/range-interval-config.js';
import { GROUP_OPTIONS } from '$lib/components/charts/network/groups.js';
import { TRACKER_REGION_OPTIONS } from '../tracker-regions.js';

export const MAX_EXPLORE_CHARTS = 12;
export const MAX_COMPARISON_FACILITIES = 6;

export const EXPLORE_RECIPES = [
	{
		id: 'generation',
		label: 'Generation mix',
		description: 'Generation and loads by fuel technology.',
		kind: 'network',
		supportsMetric: true
	},
	{
		id: 'demand',
		label: 'Demand',
		description: 'Operational or gross electricity demand.',
		kind: 'network',
		supportsMetric: true
	},
	{
		id: 'price',
		label: 'Spot price',
		description: 'Regional wholesale electricity prices.',
		kind: 'network',
		supportsMetric: true
	},
	{
		id: 'emissions',
		label: 'Emissions',
		description: 'Emissions volume or emissions intensity.',
		kind: 'network',
		supportsMetric: true
	},
	{
		id: 'market-value',
		label: 'Market value',
		description: 'Generation value by fuel technology.',
		kind: 'network',
		supportsMetric: true
	},
	{
		id: 'renewables',
		label: 'Renewables',
		description: 'Renewable generation or share of demand.',
		kind: 'network',
		supportsMetric: true
	},
	{
		id: 'curtailment',
		label: 'Curtailment',
		description: 'Wind and utility solar curtailment.',
		kind: 'network',
		supportsMetric: true
	},
	{
		id: 'flows',
		label: 'Imports and exports',
		description: 'Power or energy moving into and out of a NEM region.',
		kind: 'network',
		supportsMetric: true
	},
	{
		id: 'facility',
		label: 'Facility generation',
		description: 'One facility broken down into its units.',
		kind: 'facility',
		supportsMetric: true
	},
	{
		id: 'facility-comparison',
		label: 'Facility comparison',
		description: 'Compare total output from two to six facilities.',
		kind: 'facility',
		supportsMetric: false
	}
];

export const RECIPE_IDS = EXPLORE_RECIPES.map((recipe) => recipe.id);
const REGION_IDS = new Set(TRACKER_REGION_OPTIONS.map((region) => region.value));
const GROUP_IDS = new Set(GROUP_OPTIONS.map((group) => group.value));
const RANGE_DAYS = new Set([1, 3, 7, 30, 365, -1]);

/** @param {unknown} value @returns {value is Record<string, any>} */
function isRecord(value) {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** @param {unknown} value @param {string[]} allowed @param {string} fallback */
function enumValue(value, allowed, fallback) {
	return typeof value === 'string' && allowed.includes(value) ? value : fallback;
}

/**
 * Whether a network recipe can use a view-level region without coercion.
 * @param {string} recipeId
 * @param {any} config
 * @param {string} scope
 */
export function exploreRecipeSupportsScope(recipeId, config, scope) {
	if (recipeId === 'price' && scope === 'au') return false;
	if (
		recipeId === 'renewables' &&
		config?.renewableMeasure !== 'generation' &&
		config?.presentation !== 'metric' &&
		scope === 'au'
	) {
		return false;
	}
	if (recipeId === 'curtailment' || recipeId === 'flows') {
		return !['au', '_all', 'wem'].includes(scope);
	}
	return true;
}

/** @param {unknown} value */
export function normaliseExploreRange(value) {
	const days = isRecord(value) && RANGE_DAYS.has(Number(value.days)) ? Number(value.days) : 7;
	const preset = getPresetByDays(days);
	const options = preset ? getIntervalsForRange(preset.id) : getIntervalsForRange('7D');
	const intervalId =
		isRecord(value) &&
		typeof value.intervalId === 'string' &&
		options.options.includes(value.intervalId)
			? value.intervalId
			: options.default;
	return { days, intervalId };
}

/** @param {string} recipeId @param {'chart'|'metric'} [presentation] */
export function defaultExploreConfig(recipeId, presentation = 'chart') {
	const base = {
		presentation,
		scope: '_all',
		range: { days: 7, intervalId: '30m' },
		group: 'simple'
	};

	switch (recipeId) {
		case 'demand':
			return { ...base, demand: 'operational' };
		case 'emissions':
			return { ...base, emissionsMode: 'volume' };
		case 'renewables':
			return { ...base, renewableMeasure: 'share', includeStorage: false };
		case 'curtailment':
			return { ...base, scope: 'nsw1', curtailmentSource: 'total' };
		case 'flows':
			return { ...base, scope: 'nsw1' };
		case 'facility':
			return { ...base, networkId: 'NEM', facilityCodes: [], unitCodes: [] };
		case 'facility-comparison':
			return { ...base, networkId: 'NEM', facilityCodes: [], unitCodes: [] };
		default:
			return base;
	}
}

/**
 * @param {string} recipeId
 * @param {unknown} value
 * @param {Array<{code:string,network_id:string,units?:Array<{code:string}>}>} [facilities]
 */
export function validateExploreConfig(recipeId, value, facilities = []) {
	if (!RECIPE_IDS.includes(recipeId)) return { config: null, errors: ['Choose a chart type.'] };
	const input = isRecord(value) ? value : {};
	const recipe = recipeById(recipeId);
	const presentation = input.presentation === 'metric' ? 'metric' : 'chart';
	let scope = REGION_IDS.has(String(input.scope)) ? String(input.scope) : '_all';
	if (recipeId === 'price' && scope === 'au') scope = '_all';
	if (
		recipeId === 'renewables' &&
		input.renewableMeasure !== 'generation' &&
		presentation !== 'metric' &&
		scope === 'au'
	) {
		scope = '_all';
	}
	if (
		(recipeId === 'curtailment' || recipeId === 'flows') &&
		['au', '_all', 'wem'].includes(scope)
	) {
		scope = 'nsw1';
	}

	/** @type {Record<string, any>} */
	const config = {
		presentation,
		scope,
		range: normaliseExploreRange(input.range),
		group: GROUP_IDS.has(String(input.group)) ? String(input.group) : 'simple'
	};

	if (recipeId === 'demand') {
		config.demand = enumValue(input.demand, ['operational', 'gross'], 'operational');
	}
	if (recipeId === 'emissions') {
		config.emissionsMode = enumValue(input.emissionsMode, ['volume', 'intensity'], 'volume');
	}
	if (recipeId === 'renewables') {
		config.renewableMeasure = enumValue(input.renewableMeasure, ['generation', 'share'], 'share');
		config.includeStorage =
			input.includeStorage === true &&
			!(presentation === 'metric' && config.renewableMeasure === 'share');
	}
	if (recipeId === 'curtailment') {
		config.curtailmentSource = enumValue(
			input.curtailmentSource,
			['total', 'wind', 'solar'],
			'total'
		);
	}

	const errors = [];
	if (presentation === 'metric' && !recipe?.supportsMetric) {
		errors.push('This query is available as a chart only.');
	}
	if (recipeId === 'facility' || recipeId === 'facility-comparison') {
		const requestedNetwork = input.networkId === 'WEM' ? 'WEM' : 'NEM';
		const validFacilities = new Map(
			facilities
				.filter((facility) => facility.network_id === requestedNetwork)
				.map((facility) => [facility.code, facility])
		);
		/** @type {any[]} */
		const requestedCodes = Array.isArray(input.facilityCodes) ? input.facilityCodes : [];
		const facilityCodes = [
			...new Set(requestedCodes.filter((/** @type {any} */ code) => validFacilities.has(code)))
		].slice(0, MAX_COMPARISON_FACILITIES);
		config.networkId = requestedNetwork;
		config.facilityCodes = facilityCodes;
		config.unitCodes = Array.isArray(input.unitCodes)
			? [
					...new Set(input.unitCodes.filter((/** @type {any} */ code) => typeof code === 'string'))
				].slice(0, 30)
			: [];

		if (recipeId === 'facility' && facilityCodes.length !== 1) {
			errors.push('Choose one facility.');
		}
		if (recipeId === 'facility-comparison' && facilityCodes.length < 2) {
			errors.push('Choose at least two facilities.');
		}
	}

	return { config, errors };
}

/** @param {string} recipeId */
export function recipeById(recipeId) {
	return EXPLORE_RECIPES.find((recipe) => recipe.id === recipeId) ?? null;
}

/** @param {string} instanceId @param {string} recipeId @param {unknown} config @param {any[]} [facilities] */
export function createExploreChart(instanceId, recipeId, config, facilities = []) {
	if (!instanceId) return null;
	const validated = validateExploreConfig(recipeId, config, facilities);
	if (!validated.config || validated.errors.length) return null;
	return { instanceId, recipeId, config: validated.config };
}
