/**
 * Facility Explorer - Server-Side Page Load
 *
 * Fetches facilities list and selected facility's 7-day power data.
 * Uses server-side loading to keep API keys secure and avoid client-side fetching.
 */

import { OpenElectricityClient } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';

const client = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

/**
 * @typedef {Object} FacilityListItem
 * @property {string} code
 * @property {string} name
 * @property {string} network_id
 * @property {string} network_region
 */

/**
 * @typedef {Object} Unit
 * @property {string} code
 * @property {string} fueltech_id
 * @property {string} dispatch_type - 'GENERATOR' | 'LOAD'
 * @property {number} capacity_registered
 * @property {string} status_id
 */

/**
 * @typedef {Object} PageData
 * @property {FacilityListItem[]} facilities - All facilities for selector
 * @property {string | null} selectedCode - Currently selected facility code
 * @property {any | null} facility - Selected facility details
 * @property {any | null} powerData - Power data for selected range
 * @property {string} timeZone - Timezone offset string
 * @property {string | null} dateStart - Start date for data range
 * @property {string | null} dateEnd - End date for data range
 * @property {number | null} range - Preselected range in days
 * @property {string | null} error - Error message if any
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

	/** @type {PageData} */
	let result = {
		facilities: [],
		selectedCode,
		facility: null,
		powerData: null,
		timeZone: '+10:00',
		dateStart,
		dateEnd,
		range: days ? parseInt(days, 10) : null,
		error: null
	};

	try {
		// Fetch facilities list (operating only - 'commissioning' is not a valid API status)
		// Valid statuses are: 'committed', 'operating', 'retired'
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

		// If a facility is selected, fetch its details and power data
		if (selectedCode) {
			const selectedFacility = facilitiesResponse.data?.find((f) => f.code === selectedCode);

			if (selectedFacility) {
				result.facility = selectedFacility;

				// Determine timezone offset based on network (no DST)
				// WEM = +08:00 (AWST), NEM = +10:00 (AEST)
				result.timeZone = selectedFacility.network_id === 'WEM' ? '+08:00' : '+10:00';

				// Only fetch power data server-side for short ranges (≤14 days).
				// Energy ranges (>14 days) are fetched client-side by ChartDataManager.
				const numDays = days ? parseInt(days, 10) : 3;
				if (numDays <= 14) {
					const apiParams = new URLSearchParams({
						network_id: selectedFacility.network_id
					});
					if (dateStart) apiParams.set('date_start', dateStart);
					if (dateEnd) apiParams.set('date_end', dateEnd);
					if (days) apiParams.set('days', days);

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
		}
	} catch (err) {
		console.error('Error loading facility explorer:', err);
		result.error = /** @type {Error} */ (err).message;
	}

	return result;
}
