import { modelOptions, defaultModelPathway } from './models';
import { scenarioDescriptions } from './descriptions';

/**
 * Plan (ISP model) options for the dropdown.
 */
export const planOptions = modelOptions.map((m) => ({
	label: m.label,
	value: m.value
}));

/**
 * Get scenario options for a given model value.
 * @param {string} modelValue
 * @returns {{label: string, value: string, colour: string}[]}
 */
export function getScenarioOptions(modelValue) {
	const model = modelOptions.find((m) => m.value === modelValue);
	if (!model) return [];
	const descriptions = scenarioDescriptions[modelValue] || {};
	return model.scenarios.map((s) => ({
		label: s.label,
		value: s.value,
		colour: s.colour,
		description: descriptions[s.value] || ''
	}));
}

/**
 * Get pathway options for a given model value.
 * @param {string} modelValue
 * @returns {{label: string, value: string}[]}
 */
export function getPathwayOptions(modelValue) {
	const model = modelOptions.find((m) => m.value === modelValue);
	if (!model) return [];
	return model.pathways.map((p) => ({ label: p, value: p }));
}

/**
 * Get the default pathway for a model value.
 * @param {string} modelValue
 * @returns {string}
 */
export function getDefaultPathway(modelValue) {
	return defaultModelPathway[modelValue] || 'default';
}

/**
 * Get the default scenario for a model value.
 * @param {string} modelValue
 * @returns {string}
 */
export function getDefaultScenario(modelValue) {
	const model = modelOptions.find((m) => m.value === modelValue);
	return model ? model.scenarios[0].value : '';
}
