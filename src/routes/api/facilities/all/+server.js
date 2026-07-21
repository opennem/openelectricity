/**
 * Full facilities dataset for the map's play (year animation) mode.
 * ==================================================================
 *
 * Play mode animates the complete grid history regardless of the user's
 * active filters, so it needs the unfiltered set — the facilities page load
 * only returns the server-filtered subset. Returns the same processed shape
 * as `data.facilities` (commissioning units marked, units filtered to
 * PLAY_STATUSES) so every page consumer works unchanged.
 */

import { json } from '@sveltejs/kit';
import { OpenElectricityClient } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';
import { getCachedFacilities, setCachedFacilities } from '$lib/server/facilities-server-cache.js';
import {
	prepareStatusesForApi,
	processFacilitiesWithStatuses
} from '$lib/facilities/status-utils.js';
import { PLAY_STATUSES } from '$lib/facilities/filters.js';

const client = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

// Shares the page load's keyed server cache, so a play fetch and a page load
// with the same statuses serve each other within the TTL.
const FILTER_PARAMS = { statuses: PLAY_STATUSES, regions: [], fuelTechs: [] };

export async function GET({ setHeaders }) {
	let facilities = getCachedFacilities(FILTER_PARAMS);

	if (!facilities) {
		let facilitiesResponse = null;

		try {
			const { response } = await client.getFacilities({
				fueltech_id: [],
				status_id: /** @type {any} */ (prepareStatusesForApi(PLAY_STATUSES))
			});
			facilitiesResponse = response.data;
		} catch {
			// API error - facilitiesResponse remains null
		}

		facilities = processFacilitiesWithStatuses(facilitiesResponse, PLAY_STATUSES);

		// Only cache real results so a transient API failure isn't pinned for the TTL.
		if (facilities.length > 0) {
			setCachedFacilities(FILTER_PARAMS, facilities);
		}
	}

	// The in-process cache is per-isolate on Cloudflare — let the edge cache
	// carry the response across isolates for the same 5-minute window.
	setHeaders({ 'cache-control': 'public, max-age=300' });

	return json(facilities);
}
