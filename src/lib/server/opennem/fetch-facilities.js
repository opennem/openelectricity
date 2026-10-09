import { oeClient } from '$lib/server/oe-client.js';

/**
 * Fetch the full facility list from the OE API — no filters, so every status
 * (operating, commissioning, committed, retired) is included.
 * @returns {Promise<any[] | null>} null on upstream failure or a malformed body
 */
export async function fetchAllFacilities() {
	try {
		const { response } = await oeClient.getFacilities();
		return Array.isArray(response?.data) ? response.data : null;
	} catch {
		return null;
	}
}
