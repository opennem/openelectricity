import { getContext, setContext } from 'svelte';

const KEY = Symbol('stratify-plot');

/**
 * Set the StratifyPlotProject instance in component context.
 * @param {import('./StratifyPlotProject.svelte.js').default} project
 */
export function setStratifyContext(project) {
	setContext(KEY, project);
}

/**
 * Get the StratifyPlotProject instance from component context.
 * @returns {import('./StratifyPlotProject.svelte.js').default}
 */
export function getStratifyContext() {
	return getContext(KEY);
}
