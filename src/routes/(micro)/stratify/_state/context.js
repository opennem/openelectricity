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

const SAVE_KEY = Symbol('stratify-save-session');

/**
 * Set the builder's ChartSaveSession in component context.
 * @param {import('./ChartSaveSession.svelte.js').default} session
 */
export function setChartSaveContext(session) {
	setContext(SAVE_KEY, session);
}

/**
 * Get the builder's ChartSaveSession from component context.
 * @returns {import('./ChartSaveSession.svelte.js').default}
 */
export function getChartSaveContext() {
	return getContext(SAVE_KEY);
}
