/**
 * Facility list sorting — shared between `List.svelte` and the page-level
 * keyboard navigation so both operate on the same ordering.
 */

import { sumUnitCapacities } from '$lib/utils/capacity';
import { getRegionLabel } from '$lib/facilities/filters.js';

/**
 * @param {any} facility
 * @returns {number}
 */
function getTotalCapacity(facility) {
	return sumUnitCapacities(facility.units);
}

/**
 * @param {any} facility
 * @returns {number}
 */
function getTotalStorage(facility) {
	if (!facility.units) return 0;
	return facility.units.reduce(
		(/** @type {number} */ sum, /** @type {any} */ unit) =>
			sum + (Number(unit.capacity_storage) || 0),
		0
	);
}

/**
 * @param {any} facility
 * @returns {string}
 */
function getRegion(facility) {
	return getRegionLabel(facility.network_id, facility.network_region);
}

/**
 * Return a new array sorted to match the List view's display order.
 *
 * `sortBy: 'capacity'` sorts by the rightmost-column metric. When the user has
 * a non-capacity "Show by" metric active, pass `metricValues` (raw per-facility
 * values keyed by code) and the column will sort by that instead — keeps the
 * user's "tallest first" intent meaningful when the displayed value changes.
 *
 * @param {any[]} facilities
 * @param {'name' | 'region' | 'storage' | 'capacity'} sortBy
 * @param {'asc' | 'desc'} sortOrder
 * @param {Map<string, number> | null} [metricValues]
 * @returns {any[]}
 */
export function sortFacilities(facilities, sortBy, sortOrder, metricValues = null) {
	const sorted = [...facilities];
	sorted.sort((a, b) => {
		let comparison = 0;
		switch (sortBy) {
			case 'name':
				comparison = (a.name || '').localeCompare(b.name || '');
				break;
			case 'region':
				comparison = getRegion(a).localeCompare(getRegion(b));
				break;
			case 'storage':
				comparison = getTotalStorage(a) - getTotalStorage(b);
				break;
			case 'capacity':
				if (metricValues) {
					const av = metricValues.get(a.code) ?? 0;
					const bv = metricValues.get(b.code) ?? 0;
					comparison = av - bv;
				} else {
					comparison = getTotalCapacity(a) - getTotalCapacity(b);
				}
				break;
		}
		return sortOrder === 'asc' ? comparison : -comparison;
	});
	return sorted;
}

/**
 * Next sort state when a field is picked: re-picking the current field flips
 * the order; a new field starts at its natural default (capacity/storage
 * descending, name/region ascending). Shared by the desktop column headers
 * and the mobile sort dropdown so the rule can't drift.
 * @param {'name' | 'region' | 'storage' | 'capacity'} field
 * @param {'name' | 'region' | 'storage' | 'capacity'} sortBy
 * @param {'asc' | 'desc'} sortOrder
 * @returns {{ sortBy: 'name' | 'region' | 'storage' | 'capacity', sortOrder: 'asc' | 'desc' }}
 */
export function getNextSort(field, sortBy, sortOrder) {
	if (sortBy === field) {
		return { sortBy: field, sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' };
	}
	return {
		sortBy: field,
		sortOrder: field === 'capacity' || field === 'storage' ? 'desc' : 'asc'
	};
}
