/**
 * Fuel-tech grouping options for the Explorer (Detailed / Simplified).
 *
 * Thin wrapper over the shared `$lib/fuel-tech-groups` modules so the Explorer
 * page, NetworkChart and the fuel-tech table all resolve a group the same way.
 */

import detailed from '$lib/fuel-tech-groups/detailed';
import simple from '$lib/fuel-tech-groups/simple';

/** @type {Array<{ label: string, value: string }>} */
export const GROUP_OPTIONS = [
	{ label: detailed.label, value: detailed.value },
	{ label: simple.label, value: simple.value }
];

/** @type {Record<string, typeof detailed>} */
const GROUPS = { detailed, simple };

export const DEFAULT_GROUP = 'detailed';

/**
 * Resolve a group config by value, falling back to Detailed.
 * @param {string} value
 * @returns {{ fuelTechs: Record<string, string[]>, order: string[], labels: Record<string, string> }}
 */
export function getGroup(value) {
	return GROUPS[value] ?? detailed;
}
