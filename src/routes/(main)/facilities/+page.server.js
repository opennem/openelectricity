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
 * - sizes: comma-separated size filters
 * - facility: selected facility code for detail view
 *
 * @see ./_stores/facilities-server-cache.js for caching implementation
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

const client = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

export async function load({ url }) {
	const { searchParams } = url;
	const view = searchParams.get('view') || 'timeline';
	const statuses = searchParams.get('statuses')
		? /** @type {string} */ (searchParams.get('statuses')).split(',')
		: ['operating', 'commissioning'];
	const regions = searchParams.get('regions')
		? /** @type {string} */ (searchParams.get('regions')).split(',')
		: [];
	const fuelTechs = searchParams.get('fuel_techs')
		? /** @type {string} */ (searchParams.get('fuel_techs')).split(',')
		: [];
	const sizes = searchParams.get('sizes')
		? /** @type {string} */ (searchParams.get('sizes')).split(',').filter(Boolean)
		: [];
	const selectedFacility = searchParams.get('facility') || null;

	const filterParams = { statuses, regions, fuelTechs };

	// Check server-side cache first
	const cached = getCachedFacilities(filterParams);
	if (cached) {
		const { powerData } = await fetchFacilityPowerData(client, cached, selectedFacility);

		return {
			facilities: cached,
			view,
			statuses,
			regions,
			fuelTechs,
			sizes,
			selectedFacility,
			powerData,
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

	// Fetch power data for selected facility
	const { powerData } = await fetchFacilityPowerData(
		client,
		processedFacilities,
		selectedFacility
	);

	return {
		facilities: processedFacilities,
		view,
		statuses,
		regions,
		fuelTechs,
		sizes,
		selectedFacility,
		powerData,
		fromCache: false
	};
}
