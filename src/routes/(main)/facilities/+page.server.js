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
import isCommissioningCheck from './_utils/is-commissioning';
import { getCachedFacilities, setCachedFacilities } from './_stores/facilities-server-cache.js';

const client = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

export async function load({ url }) {
	/**
	 * Available options:
	 * battery, bioenergy_biogas, bioenergy_biomass, coal_black, coal_brown, distillate, gas_ccgt, gas_ocgt, gas_recip, gas_steam, gas_wcmg, hydro, pumps, solar_rooftop, solar_thermal, solar_utility, nuclear, other, solar, wind, wind_offshore, imports, exports, interconnector, aggregator_vpp, aggregator_dr
	 */

	/** @type {Record<string, string[]>} */
	const fuelTechMap = {
		battery: ['battery'],
		bioenergy: ['bioenergy_biogas', 'bioenergy_biomass'],
		coal: ['coal_black', 'coal_brown'],
		distillate: ['distillate'],
		gas: ['gas_ccgt', 'gas_ocgt', 'gas_recip', 'gas_steam', 'gas_wcmg'],
		hydro: ['hydro'],
		pumps: ['pumps'],
		solar: ['solar_rooftop', 'solar_utility'],
		wind: ['wind']
	};

	const { searchParams } = url;
	const view = searchParams.get('view') || 'timeline';
	/* @type {import('openelectricity').UnitStatusType[]} */
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
		// If a facility is selected, fetch its power data even with cached facilities
		let powerData = null;
		let selectedFacilityData = null;

		if (selectedFacility) {
			selectedFacilityData = cached.find((f) => f.code === selectedFacility) ?? null;

			if (selectedFacilityData) {
				try {
					const networkId = /** @type {import('openelectricity').NetworkCode} */ (
						selectedFacilityData.network_id
					);
					const { response } = await client.getFacilityData(
						networkId,
						selectedFacility,
						['power'],
						{
							interval: '5m'
						}
					);
					powerData = response;
				} catch (err) {
					console.error('Error fetching facility power data:', err);
					// Set empty object to indicate "no data" vs null for "loading"
					powerData = { data: [] };
				}
			}
		}

		return {
			facilities: cached,
			view,
			statuses,
			regions,
			fuelTechs,
			sizes,
			selectedFacility,
			selectedFacilityData,
			powerData,
			fromCache: true
		};
	}

	// Map fuel tech selections to API fuel tech IDs
	// If a category (like "gas") is selected, expand to all sub-technologies
	// If a specific fuel tech ID (like "gas_ccgt") is selected, use it directly
	const fuelTechIds = fuelTechs
		.map((fuelTech) => {
			if (fuelTechMap[fuelTech]) {
				// It's a category, expand to all sub-technologies
				return fuelTechMap[fuelTech];
			}
			// It's a specific fuel tech ID, use directly
			return [fuelTech];
		})
		.flat();

	/**
	 * Commissioning status is not included in the API, so we need to add it manually.
	 */
	let newStatuses = [];
	// if statuses includes only commissioning, add operating to statuses and always remove commissioning.
	if (statuses.includes('commissioning') && statuses.length === 1) {
		newStatuses.push('operating');
	} else if (statuses.includes('commissioning') && !statuses.includes('operating')) {
		newStatuses = statuses.filter((status) => status !== 'commissioning');
		newStatuses.push('operating');
	} else {
		newStatuses = statuses.filter((status) => status !== 'commissioning');
	}

	let facilitiesResponse = null;

	try {
		const { response } = await client.getFacilities({
			fueltech_id: fuelTechIds,
			status_id: newStatuses
		});
		facilitiesResponse = response.data;
	} catch (error) {
		console.error(error);
	}

	// filter facilities by regions
	const facilities =
		regions.length <= 0
			? facilitiesResponse
			: facilitiesResponse
				? facilitiesResponse.filter((facility) =>
						regions.includes(facility.network_region.toLowerCase())
					)
				: [];

	// mark facilities as commissioning if any unit is commissioning
	facilities?.forEach((facility) => {
		facility.units.forEach((unit) => {
			if (isCommissioningCheck(unit)) {
				/** @type {any} */ (unit).isCommissioning = true;
				/** @type {any} */ (unit).status_id = 'commissioning';
			}
		});
	});

	/** @type {any[]} */
	let newFacilities = [];
	facilities?.forEach((facility) => {
		newFacilities.push({
			...facility,
			units: facility.units.filter((unit) => {
				return unit.status_id && statuses.includes(unit.status_id);
			})
		});
	});

	// Store in server cache
	setCachedFacilities(filterParams, newFacilities);

	// If a facility is selected, fetch its power data
	let powerData = null;
	let selectedFacilityData = null;

	if (selectedFacility) {
		selectedFacilityData = newFacilities.find((f) => f.code === selectedFacility) ?? null;

		if (selectedFacilityData) {
			try {
				const networkId = /** @type {import('openelectricity').NetworkCode} */ (
					selectedFacilityData.network_id
				);
				const { response } = await client.getFacilityData(networkId, selectedFacility, ['power'], {
					interval: '5m'
				});
				powerData = response;
			} catch (err) {
				console.error('Error fetching facility power data:', err);
				// Set empty object to indicate "no data" vs null for "loading"
				powerData = { data: [] };
			}
		}
	}

	return {
		facilities: newFacilities,
		view,
		statuses,
		regions,
		fuelTechs,
		sizes,
		selectedFacility,
		selectedFacilityData,
		powerData,
		fromCache: false
	};
}
