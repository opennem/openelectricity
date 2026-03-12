/**
 * Facility Plot - Server-Side Page Load
 *
 * Fetches two facilities (Bayswater + Gullen Range) and 7-day power data
 * for the Observable Plot multi-chart sync demo.
 */

import { OpenElectricityClient } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';

const client = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

const FACILITY_CODES = ['BAYSW', 'GULLRGWF'];

/**
 * @param {Object} params
 * @param {typeof fetch} params.fetch
 */
export async function load({ fetch }) {
	try {
		const { response: facilitiesResponse } = await client.getFacilities({
			status_id: ['operating']
		});

		const allFacilities = facilitiesResponse.data ?? [];

		const results = await Promise.all(
			FACILITY_CODES.map(async (code) => {
				const facility = allFacilities.find(
					(/** @type {any} */ f) => f.code === code
				);

				if (!facility) {
					return {
						facility: null,
						powerData: null,
						timeZone: '+10:00',
						error: `Facility "${code}" not found`
					};
				}

				const timeZone = facility.network_id === 'WEM' ? '+08:00' : '+10:00';

				try {
					const apiParams = new URLSearchParams({
						network_id: facility.network_id,
						days: '7'
					});

					const powerRes = await fetch(
						`/api/facilities/${code}/power?${apiParams.toString()}`
					);

					if (powerRes.ok) {
						const powerJson = await powerRes.json();
						return { facility, powerData: powerJson.response, timeZone, error: null };
					}
					return { facility, powerData: null, timeZone, error: 'Failed to fetch power data' };
				} catch (err) {
					return {
						facility,
						powerData: null,
						timeZone,
						error: /** @type {Error} */ (err).message
					};
				}
			})
		);

		return { facilities: results };
	} catch (err) {
		console.error('Error loading facility plot:', err);
		return {
			facilities: [{
				facility: null,
				powerData: null,
				timeZone: '+10:00',
				error: /** @type {Error} */ (err).message
			}]
		};
	}
}
