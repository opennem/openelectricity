/**
 * Fuel-tech grouping options supported by network charts.
 *
 * Thin wrapper over the shared `$lib/fuel-tech-groups` modules so the Explorer
 * page, NetworkChart and the fuel-tech table all resolve a group the same way.
 */

import detailed from '$lib/fuel-tech-groups/detailed';
import simple from '$lib/fuel-tech-groups/simple';
import coalGasRenewables from '$lib/fuel-tech-groups/coal-gas-renewables';
import flexibility from '$lib/fuel-tech-groups/flexibility';
import renewablesFossils from '$lib/fuel-tech-groups/renewables-fossils';
import vreResidual from '$lib/fuel-tech-groups/vre-residual';
import { loadFuelTechs } from '$lib/fuel_techs';

// Menu order mirrors the legacy explore tool's grouping list.
const GROUP_CONFIGS = [
	detailed,
	simple,
	coalGasRenewables,
	flexibility,
	renewablesFossils,
	vreResidual
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

const loadFuelTechCodes = new Set(/** @type {string[]} */ (loadFuelTechs));

/**
 * Group ids whose member fuel techs are all loads — the groups a stacked chart
 * inverts below the axis. A mixed group (loads plus sources) stays positive:
 * its net sign is data-dependent, so inverting it would be a guess.
 * @param {ReturnType<typeof getGroup>} groupConfig
 * @returns {string[]}
 */
export function loadGroupsFor(groupConfig) {
	return Object.entries(groupConfig.fuelTechs)
		.filter(
			([, fuelTechs]) =>
				fuelTechs.length > 0 && fuelTechs.every((fuelTech) => loadFuelTechCodes.has(fuelTech))
		)
		.map(([groupId]) => groupId);
}
