/**
 * Facility Explorer - Server-Side Page Load
 *
 * Strategy: fetch the selected facility's full metadata via the OE API's
 * `/facilities/?facility_code=...` endpoint (fast, single record). Stream the
 * full facilities list in parallel for the selector UI without blocking the
 * critical render.
 */

import { OpenElectricityClient } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';
import { client as sanityClient } from '$lib/sanity';

const client = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

/**
 * Fetch a single facility by code via the raw OE API. The 0.8.1 SDK's
 * getFacilities() doesn't expose a facility_code filter, but the underlying
 * endpoint accepts it.
 *
 * @param {string} code
 * @returns {Promise<any | null>}
 */
async function fetchFacilityByCode(code) {
	const url = `${PUBLIC_OE_API_URL}/facilities/?facility_code=${encodeURIComponent(code)}`;
	const res = await fetch(url, {
		headers: { Authorization: `Bearer ${PUBLIC_OE_API_KEY}` }
	});
	if (!res.ok) return null;
	const json = await res.json();
	return json.data?.[0] ?? null;
}

/**
 * @typedef {Object} FacilityListItem
 * @property {string} code
 * @property {string} name
 * @property {string} network_id
 * @property {string} network_region
 */

/**
 * @typedef {Object} PageData
 * @property {Promise<FacilityListItem[]>} facilities - Streamed list for selector
 * @property {string | null} selectedCode
 * @property {any | null} facility - Selected facility details (from /facilities/?facility_code=...)
 * @property {any | null} powerData - Power data for selected range
 * @property {string} timeZone
 * @property {string | null} dateStart
 * @property {string | null} dateEnd
 * @property {number | null} range
 * @property {any | null} sanityFacility
 * @property {string | null} error
 */

/**
 * @param {Object} params
 * @param {URL} params.url
 * @param {typeof fetch} params.fetch
 * @returns {Promise<PageData>}
 */
export async function load({ url, fetch }) {
	const { searchParams } = url;
	const selectedCode = searchParams.get('facility') || 'BAYSW';
	const dateStart = searchParams.get('date_start');
	const dateEnd = searchParams.get('date_end');
	const days = searchParams.get('days');

	// Kick off both requests in parallel.
	// - `facility` is awaited because the critical render depends on it.
	// - `facilitiesListPromise` is streamed to the client without blocking.
	const facilityPromise = fetchFacilityByCode(selectedCode);

	const facilitiesListPromise = client
		.getFacilities({ status_id: ['operating'] })
		.then((r) =>
			(r.response.data || [])
				.map((f) => ({
					code: f.code,
					name: f.name,
					network_id: f.network_id,
					network_region: f.network_region
				}))
				.sort((a, b) => a.name.localeCompare(b.name))
		)
		.catch(() => /** @type {FacilityListItem[]} */ ([]));

	/** @type {PageData} */
	const result = {
		facilities: facilitiesListPromise,
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
		const selectedFacility = await facilityPromise;

		if (!selectedFacility) {
			result.error = `Facility "${selectedCode}" not found`;
			return result;
		}

		result.facility = selectedFacility;
		result.timeZone = selectedFacility.network_id === 'WEM' ? '+08:00' : '+10:00';

		// Fetch Sanity data and power data in parallel
		const sanityPromise = sanityClient
			.fetch(
				`*[_type == "facility" && code == $code][0]{
					_id, code, name, website, wikipedia, wikidata_id, osm_way_id, npiId, location,
					description, metadata_array,
					network->{_id, code, name},
					region->{_id, code, name},
					owners[]->{_id, name, legal_name, website, contact_email},
					photos,
					units[]->{
						_id, code, dispatch_type, status, capacity_registered, capacity_maximum,
						data_first_seen, data_last_seen, emissions_factor_co2,
						fuel_technology->{_id, code, name, colour, renewable},
						metadata_array
					}
				}`,
				{ code: selectedCode }
			)
			.catch(() => null);

		// Only fetch power data server-side for short ranges (≤14 days).
		// Energy ranges (>14 days) are fetched client-side by ChartDataManager.
		const numDays = days ? parseInt(days, 10) : 7;
		let powerPromise = /** @type {Promise<any | null>} */ (Promise.resolve(null));
		if (numDays > 0 && numDays <= 14) {
			const apiParams = new URLSearchParams({
				network_id: selectedFacility.network_id
			});
			if (dateStart) apiParams.set('date_start', dateStart);
			if (dateEnd) apiParams.set('date_end', dateEnd);
			apiParams.set('days', days || String(numDays));

			powerPromise = fetch(`/api/facilities/${selectedCode}/power?${apiParams.toString()}`)
				.then(async (res) => {
					if (!res.ok) {
						result.error = 'Failed to fetch power data';
						return null;
					}
					const json = await res.json();
					return json.response;
				})
				.catch(() => null);
		}

		const [sanityFacility, powerData] = await Promise.all([sanityPromise, powerPromise]);
		result.sanityFacility = sanityFacility;
		result.powerData = powerData;
	} catch (err) {
		console.error('Error loading facility explorer:', err);
		result.error = /** @type {Error} */ (err).message;
	}

	return result;
}
