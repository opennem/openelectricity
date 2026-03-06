/**
 * Facility Detail - Server-Side Page Load
 *
 * Fetches facility list, selected facility details from OE API,
 * enriched unit data from Sanity CMS, and power data for short ranges.
 */

import { OpenElectricityClient } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';
import { client as sanityClient } from '$lib/sanity';
import { getPrimaryFuelTechGroup } from './_utils/fuel-tech-group.js';

const client = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

/**
 * @param {Object} params
 * @param {URL} params.url
 * @param {typeof fetch} params.fetch
 */
export async function load({ url, fetch }) {
	const { searchParams } = url;
	const selectedCode = searchParams.get('facility') || 'BAYSW';
	const dateStart = searchParams.get('date_start');
	const dateEnd = searchParams.get('date_end');
	const days = searchParams.get('days');

	/** @type {any} */
	let result = {
		facilities: [],
		selectedCode,
		facility: null,
		powerData: null,
		timeZone: '+10:00',
		dateStart,
		dateEnd,
		range: days ? parseInt(days, 10) : 7,
		sanityFacility: null,
		error: null
	};

	try {
		const { response: facilitiesResponse } = await client.getFacilities({
			status_id: ['operating']
		});

		result.facilities = (facilitiesResponse.data || [])
			.map((f) => ({
				code: f.code,
				name: f.name,
				network_id: f.network_id,
				network_region: f.network_region,
				fuelTechGroup: getPrimaryFuelTechGroup(/** @type {any[]} */ (f.units ?? []))
			}))
			.sort((a, b) => a.name.localeCompare(b.name));

		if (selectedCode) {
			const selectedFacility = facilitiesResponse.data?.find((f) => f.code === selectedCode);

			// Enriched Sanity query — includes MLF, storage capacity, unit_types,
			// emissions factors, closure dates, commencement dates
			const sanityPromise = sanityClient
				.fetch(
					`*[_type == "facility" && code == $code][0]{
					_id, code, name, website, wikipedia, wikidata_id, location,
					description, metadata_array,
					network->{_id, code, name},
					region->{_id, code, name},
					owners[]->{_id, name, legal_name, website},
					photos,
					units[]->{
						_id, code, dispatch_type, status, capacity_registered, capacity_maximum,
						storage_capacity, min_generation_capacity, grid_forming,
						marginal_loss_factor, emissions_factor_co2, emissions_factor_source,
						data_first_seen, data_last_seen,
						commencement_date, commencement_date_specificity,
						expected_closure_date, expected_closure_date_specificity,
						construction_start_date, construction_cost,
						fuel_technology->{_id, code, name, renewable},
						unit_types[]->{
							unit_number, unit_size, capacity,
							unit_brand, unit_model, unit_model_year,
							unit_height, unit_weight, mounting_type, unit_efficiency
						},
						metadata_array
					}
				}`,
					{ code: selectedCode }
				)
				.catch(() => null);

			if (selectedFacility) {
				result.facility = selectedFacility;
				result.timeZone = selectedFacility.network_id === 'WEM' ? '+08:00' : '+10:00';

				// Only fetch power data server-side for short ranges (≤14 days)
				const numDays = days ? parseInt(days, 10) : 7;
				if (numDays > 0 && numDays <= 14) {
					const apiParams = new URLSearchParams({
						network_id: selectedFacility.network_id
					});
					if (dateStart) apiParams.set('date_start', dateStart);
					if (dateEnd) apiParams.set('date_end', dateEnd);
					apiParams.set('days', days || String(numDays));

					const powerRes = await fetch(
						`/api/facilities/${selectedCode}/power?${apiParams.toString()}`
					);

					if (powerRes.ok) {
						const powerJson = await powerRes.json();
						result.powerData = powerJson.response;
					} else {
						result.error = 'Failed to fetch power data';
					}
				}
			} else {
				result.error = `Facility "${selectedCode}" not found`;
			}

			result.sanityFacility = await sanityPromise;
		}
	} catch (err) {
		console.error('Error loading facility detail:', err);
		result.error = /** @type {Error} */ (err).message;
	}

	return result;
}
