import { json } from '@sveltejs/kit';
import { fetchFacilityByCode } from '$lib/server/opennem/fetch-facility-by-code.js';

/**
 * Single-facility endpoint — returns the complete facility (every unit, all fuel
 * techs and statuses) by code, unaffected by the /facilities list filters.
 * Fetched client-side when a facility is selected on the /facilities page so the
 * detail panel shows the whole facility (the same data the dedicated
 * /facility/[code] page renders) rather than just the units matching the active
 * fuel-tech/status filter. Returns `null` (200) when the code is unknown so the
 * panel degrades gracefully to the filtered data it already holds.
 *
 * @param {Object} args
 * @param {{ code: string }} args.params
 * @param {(headers: Record<string, string>) => void} args.setHeaders
 */
export async function GET({ params, setHeaders }) {
	const facility = await fetchFacilityByCode(params.code);

	// Facility identity + unit makeup change rarely; cache at the edge and let the
	// browser reuse it so re-selecting a facility is instant.
	setHeaders({ 'cache-control': 'public, max-age=3600' });

	return json(facility);
}
