import { fuelTechNameMap } from '$lib/fuel_techs';
import { regions as regionDefs } from '../../../routes/(main)/facilities/_utils/filters.js';

/**
 * @typedef {Object} SearchableFacility
 * @property {string} code
 * @property {string} name
 * @property {string} network_id
 * @property {string} network_region
 * @property {string[]} [fuel_techs]
 */

/** Network-level synonyms beyond region labels (e.g. "WEM" matches "western australia"). */
const networkLabels = {
	WEM: ['wem', 'western australia', 'wa'],
	NEM: ['nem', 'national electricity market']
};

/**
 * Build a lowercase search haystack for a facility — name, code, fuel-tech
 * ids and display names, region short/long labels, network id and synonyms.
 * @param {SearchableFacility} f
 * @returns {string}
 */
export function buildFacilityHaystack(f) {
	const parts = [f.name, f.code];

	if (f.fuel_techs?.length) {
		for (const ft of f.fuel_techs) {
			parts.push(ft);
			const name = fuelTechNameMap[/** @type {keyof typeof fuelTechNameMap} */ (ft)];
			if (name) parts.push(name);
		}
	}

	if (f.network_region) {
		const key = f.network_region.toLowerCase();
		parts.push(key);
		const match = regionDefs.find((r) => r.value === key);
		if (match) {
			if (match.label) parts.push(match.label);
			if (match.longLabel) parts.push(match.longLabel);
		}
	}

	if (f.network_id) {
		parts.push(f.network_id);
		const extras = networkLabels[/** @type {keyof typeof networkLabels} */ (f.network_id)];
		if (extras) parts.push(...extras);
	}

	return parts.join(' ').toLowerCase();
}

/**
 * Split a raw query into lowercased terms (whitespace-delimited, AND semantics).
 * @param {string} query
 * @returns {string[]}
 */
export function parseQueryTerms(query) {
	const q = query.toLowerCase().trim();
	if (!q) return [];
	return q.split(/\s+/).filter(Boolean);
}
