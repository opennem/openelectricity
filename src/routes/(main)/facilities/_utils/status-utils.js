import isCommissioningCheck from './is-commissioning';

/**
 * Prepare statuses for API call.
 * The API doesn't have a 'commissioning' status - units are marked as commissioning
 * based on their dates. So we need to convert commissioning to operating for the API.
 *
 * @param {string[]} statuses - User-selected statuses (may include 'commissioning')
 * @returns {string[]} - Statuses formatted for API call
 */
export function prepareStatusesForApi(statuses) {
	// If only commissioning is selected, we need operating units to filter from
	if (statuses.includes('commissioning') && statuses.length === 1) {
		return ['operating'];
	}

	// If commissioning is selected but not operating, add operating to get the data
	if (statuses.includes('commissioning') && !statuses.includes('operating')) {
		return [...statuses.filter((status) => status !== 'commissioning'), 'operating'];
	}

	// Otherwise, just remove commissioning from the list (we'll mark it client-side)
	return statuses.filter((status) => status !== 'commissioning');
}

/**
 * Mark commissioning units and filter facilities by selected statuses.
 * Units are marked as commissioning based on their expected_closure_date and registered_date.
 *
 * @param {any[] | null} facilities - Raw facilities from API
 * @param {string[]} selectedStatuses - User-selected statuses
 * @returns {any[]} - Processed facilities with commissioning marked and filtered by status
 */
export function processFacilitiesWithStatuses(facilities, selectedStatuses) {
	if (!facilities) return [];

	// First, mark commissioning units
	facilities.forEach((facility) => {
		facility.units.forEach((/** @type {any} */ unit) => {
			if (isCommissioningCheck(unit)) {
				unit.isCommissioning = true;
				unit.status_id = 'commissioning';
			}
		});
	});

	// Then filter units by selected statuses
	return facilities.map((facility) => ({
		...facility,
		units: facility.units.filter(
			(/** @type {any} */ unit) => unit.status_id && selectedStatuses.includes(unit.status_id)
		)
	}));
}

/**
 * Filter facilities by regions
 *
 * @param {any[] | null} facilities - Facilities to filter
 * @param {string[]} regions - Selected region codes (lowercase)
 * @returns {any[]} - Filtered facilities
 */
export function filterFacilitiesByRegions(facilities, regions) {
	if (!facilities) return [];
	if (regions.length === 0) return facilities;

	return facilities.filter((facility) =>
		regions.includes(facility.network_region.toLowerCase())
	);
}
