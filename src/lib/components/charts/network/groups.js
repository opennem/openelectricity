/**
 * Fuel-tech grouping options supported by network charts.
 *
 * Thin wrapper over the shared `$lib/fuel-tech-groups` modules so the Explorer
 * page, NetworkChart and the fuel-tech table all resolve a group the same way.
 */

import detailed from '$lib/fuel-tech-groups/detailed';
import simple from '$lib/fuel-tech-groups/simple';
import renewablesFossils from '$lib/fuel-tech-groups/renewables-fossils';
import vreResidual from '$lib/fuel-tech-groups/vre-residual';
import sourcesLoads from '$lib/fuel-tech-groups/sources-loads';
import sourcesWithoutBattery from '$lib/fuel-tech-groups/sources-without-battery';

const GROUP_CONFIGS = [
	simple,
	detailed,
	renewablesFossils,
	vreResidual,
	sourcesLoads,
	sourcesWithoutBattery
];

/** @type {Array<{ label: string, value: string }>} */
export const GROUP_OPTIONS = GROUP_CONFIGS.map(({ label, value }) => ({ label, value }));

/** @type {Record<string, typeof detailed>} */
const GROUPS = Object.fromEntries(GROUP_CONFIGS.map((config) => [config.value, config]));

export const DEFAULT_GROUP = 'detailed';

/**
 * Resolve a group config by value, falling back to Detailed.
 * @param {string} value
 * @returns {{ label: string, value: string, fuelTechs: Record<string, string[]>, order: string[], labels: Record<string, string> }}
 */
export function getGroup(value) {
	return GROUPS[value] ?? detailed;
}
