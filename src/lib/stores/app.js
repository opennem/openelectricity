import { readable } from 'svelte/store';
import { PUBLIC_EXPLORE_URL, PUBLIC_FEATURE_FLAGS } from '$env/static/public';

/**
 * Build-time feature flags. Parsed from `PUBLIC_FEATURE_FLAGS` (JSON string in
 * `.env`) — flip a value to true/false in `.env` and restart the dev server.
 *
 * @type {Record<string, boolean>}
 */
export const parsedFeatureFlags = PUBLIC_FEATURE_FLAGS ? JSON.parse(PUBLIC_FEATURE_FLAGS) : {};

/**
 * @param {string} name
 * @returns {boolean}
 */
export function isFeatureEnabled(name) {
	return parsedFeatureFlags[name] === true;
}
/** @type {import('svelte/store').Readable<*>} */
export const featureFlags = readable(parsedFeatureFlags);

/** @type {import('svelte/store').Readable<string>} */
export const dataTrackerLink = readable(PUBLIC_EXPLORE_URL);
