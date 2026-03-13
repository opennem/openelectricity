/**
 * Facility Data — Server-Side Page Load
 *
 * Fetches facility data from OE API and Sanity CMS for side-by-side comparison.
 */

import { OpenElectricityClient } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';
import { client as sanityClient } from '$lib/sanity';

const client = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

const SANITY_FACILITY_QUERY = `*[_type == "facility" && code == $code][0]{
	_id, code, name, website, wikipedia, wikidata_id, osm_way_id, npiId, location,
	description, metadata_array,
	network->{_id, code, name},
	region->{_id, code, name},
	owners[]->{_id, name, legal_name, website, contact_email},
	photos,
	units[]->{
		_id, code, dispatch_type, status, capacity_registered, capacity_maximum,
		storage_capacity, min_generation_capacity, grid_forming, marginal_loss_factor,
		emissions_factor_co2, emissions_factor_source,
		data_first_seen, data_last_seen,
		commissioning_confirmed, expected_operation_date, expected_operation_date_specificity,
		expected_closure_date, expected_closure_date_specificity,
		commencement_date, commencement_date_specificity,
		closure_date, closure_date_specificity,
		construction_start_date, construction_cost,
		cis_tender_recipient,
		fuel_technology->{_id, code, name, colour, renewable, dispatch_type},
		unit_types[]->{
			_id, unit_number, unit_size, capacity, unit_brand, unit_model,
			unit_model_year, unit_model_url, unit_height, unit_weight,
			mounting_type, unit_efficiency
		},
		metadata_array
	}
}`;

/**
 * @param {Object} params
 * @param {URL} params.url
 * @param {typeof fetch} params.fetch
 * @returns {Promise<{
 *   facilities: Array<{code: string, name: string, network_id: string, network_region: string}>,
 *   selectedCode: string | null,
 *   facility: any | null,
 *   sanityFacility: any | null,
 *   pollutionData: any | null,
 *   error: string | null
 * }>}
 */
export async function load({ url, fetch }) {
	const selectedCode = url.searchParams.get('facility') || 'BAYSW';

	/** @type {{ facilities: any[], selectedCode: string | null, facility: any | null, sanityFacility: any | null, pollutionData: any | null, error: string | null }} */
	let result = {
		facilities: [],
		selectedCode,
		facility: null,
		sanityFacility: null,
		pollutionData: null,
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
				network_region: f.network_region
			}))
			.sort((a, b) => a.name.localeCompare(b.name));

		if (selectedCode) {
			const selectedFacility = facilitiesResponse.data?.find((f) => f.code === selectedCode);

			if (selectedFacility) {
				result.facility = selectedFacility;
			} else {
				result.error = `Facility "${selectedCode}" not found`;
			}

			result.sanityFacility = await sanityClient
				.fetch(SANITY_FACILITY_QUERY, { code: selectedCode })
				.catch(() => null);

			if (result.facility?.npi_id) {
				try {
					const pollutionRes = await fetch(`/api/facilities/${selectedCode}/pollution`);
					if (pollutionRes.ok) {
						const pollutionJson = await pollutionRes.json();
						const data = pollutionJson.response?.data;
						result.pollutionData = data?.length ? data : null;
					}
				} catch (err) {
					console.warn('[facility-data] pollution fetch failed:', /** @type {Error} */ (err).message);
				}
			}
		}
	} catch (err) {
		console.error('Error loading facility data:', err);
		result.error = /** @type {Error} */ (err).message;
	}

	return result;
}
