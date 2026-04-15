import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';

/**
 * Fetch a single facility by code via the raw OE API. The 0.8.1 SDK's
 * getFacilities() doesn't expose a facility_code filter, but the underlying
 * endpoint accepts it.
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
