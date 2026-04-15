/**
 * Facilities Page Server Load Function
 * =====================================
 *
 * This is a server-only load function (+page.server.js) that fetches facilities
 * data from the OpenElectricity API. Using server-side loading avoids the SvelteKit
 * warning about using `window.fetch` instead of the load function's `fetch`.
 *
 * Data Flow:
 * ----------
 * 1. Parse filter parameters from URL search params
 * 2. Check server-side cache for matching data (5-minute TTL)
 * 3. If cache miss, fetch from OpenElectricity API
 * 4. Process facilities (mark commissioning units, filter by status)
 * 5. Store processed data in cache
 * 6. Return facilities data to page component
 *
 * Filter Parameters (URL search params):
 * --------------------------------------
 * - view: 'timeline' | 'list' | 'map' (default: 'timeline')
 * - statuses: comma-separated status IDs (default: 'operating,commissioning')
 * - regions: comma-separated region codes (e.g., 'nsw,vic')
 * - fuel_techs: comma-separated fuel tech IDs or categories
 * - capacity_min: minimum capacity in MW (client-side filter)
 * - capacity_max: maximum capacity in MW (client-side filter)
 * - facility: selected facility code for detail view
 *
 * See _stores/facilities-server-cache.js for caching implementation
 */

import { OpenElectricityClient } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';
import { getCachedFacilities, setCachedFacilities } from './_stores/facilities-server-cache.js';
import { expandFuelTechs } from './_utils/fuel-tech-map.js';
import {
	prepareStatusesForApi,
	processFacilitiesWithStatuses,
	filterFacilitiesByRegions
} from './_utils/status-utils.js';
import { fetchFacilityPowerData } from './_utils/fetch-power-data.js';
import { fetchFacilityOwners } from './_utils/fetch-facility-owners.js';
import { DEFAULT_STATUSES, ALL_STATUSES } from './_utils/filters.js';

const client = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

export async function load({ url }) {
	const { searchParams } = url;
	const view = searchParams.get('view') || 'timeline';
	const statusesParam = searchParams.has('statuses')
		? /** @type {string} */ (searchParams.get('statuses')).split(',').filter(Boolean)
		: DEFAULT_STATUSES;

	// Empty selection means "all statuses"
	const statuses = statusesParam.length === 0 ? ALL_STATUSES : statusesParam;
	const regions = searchParams.get('regions')
		? /** @type {string} */ (searchParams.get('regions')).split(',')
		: [];
	const fuelTechs = searchParams.get('fuel_techs')
		? /** @type {string} */ (searchParams.get('fuel_techs')).split(',')
		: [];
	// Capacity range - parsed on client, just pass through
	const capacityMinParam = searchParams.get('capacity_min');
	const capacityMaxParam = searchParams.get('capacity_max');
	const capacityMin = capacityMinParam ? parseInt(capacityMinParam, 10) : null;
	const capacityMax = capacityMaxParam ? parseInt(capacityMaxParam, 10) : null;
	// Year range - parsed on client, just pass through
	const yearMinParam = searchParams.get('year_min');
	const yearMaxParam = searchParams.get('year_max');
	const yearMin = yearMinParam ? parseInt(yearMinParam, 10) : null;
	const yearMax = yearMaxParam ? parseInt(yearMaxParam, 10) : null;
	const selectedFacility = searchParams.get('facility') || null;

	const filterParams = { statuses, regions, fuelTechs };

	// Check server-side cache first
	const cached = getCachedFacilities(filterParams);
	if (cached) {
		const [powerData, selectedFacilityOwners] = await Promise.all([
			fetchFacilityPowerData(client, cached, selectedFacility),
			fetchFacilityOwners(selectedFacility)
		]);

		return {
			facilities: cached,
			view,
			statuses: statusesParam.length === 0 ? [] : statuses,
			regions,
			fuelTechs,
			capacityMin,
			capacityMax,
			yearMin,
			yearMax,
			selectedFacility,
			powerData,
			selectedFacilityOwners,
			fromCache: true
		};
	}

	// Expand fuel tech selections to API IDs
	const fuelTechIds = expandFuelTechs(fuelTechs);

	// Prepare statuses for API (handle commissioning conversion)
	const apiStatuses = prepareStatusesForApi(statuses);

	let facilitiesResponse = null;

	try {
		const { response } = await client.getFacilities({
			fueltech_id: fuelTechIds,
			status_id: apiStatuses
		});
		facilitiesResponse = response.data;
	} catch {
		// API error - facilitiesResponse remains null
	}

	// Filter by regions
	const regionFiltered = filterFacilitiesByRegions(facilitiesResponse, regions);

	// Process facilities: mark commissioning units and filter by selected statuses
	const processedFacilities = processFacilitiesWithStatuses(regionFiltered, statuses);

	// Store in server cache
	setCachedFacilities(filterParams, processedFacilities);

	// Fetch power data and owner info for the selected facility in parallel
	const [powerData, selectedFacilityOwners] = await Promise.all([
		fetchFacilityPowerData(client, processedFacilities, selectedFacility),
		fetchFacilityOwners(selectedFacility)
	]);

	return {
		facilities: processedFacilities,
		view,
		statuses: statusesParam.length === 0 ? [] : statuses,
		regions,
		fuelTechs,
		capacityMin,
		capacityMax,
		yearMin,
		yearMax,
		selectedFacility,
		powerData,
		selectedFacilityOwners,
		fromCache: false
	};
}
