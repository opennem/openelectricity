import { getContext, setContext } from 'svelte';

const KEY = Symbol('stratify');

/**
 * Set the StratifyProject instance in component context.
 * @param {import('$lib/stratify/StratifyProject.svelte.js').default} project
 */
export function setStratifyContext(project) {
	setContext(KEY, project);
}

/**
 * Get the StratifyProject instance from component context.
 * @returns {import('$lib/stratify/StratifyProject.svelte.js').default}
 */
export function getStratifyContext() {
	return getContext(KEY);
}
