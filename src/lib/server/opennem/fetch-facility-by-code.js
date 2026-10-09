import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';

/**
 * Fetch a single facility by code via the raw OE API — the one OE call that
 * bypasses `$lib/server/oe-client.js`. The SDK's getFacilities() (as of 0.10.0)
 * has no facility_code filter and its request() is private, but the endpoint
 * accepts the filter; move this onto the client once the SDK exposes it. OE
 * returns native unit statuses, including commissioning.
 *
 * @param {string} code
 * @returns {Promise<any | null>}
 */
export async function fetchFacilityByCode(code) {
	const url = `${PUBLIC_OE_API_URL}/facilities/?facility_code=${encodeURIComponent(code)}`;
	const res = await fetch(url, {
		headers: { Authorization: `Bearer ${PUBLIC_OE_API_KEY}` }
	});
	if (!res.ok) return null;
	const json = await res.json();
	return json.data?.[0] ?? null;
}
