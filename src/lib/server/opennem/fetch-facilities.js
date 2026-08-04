import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';

/**
 * Fetch the full facility list via the raw OE API — no filters, so every
 * status (operating, committed, retired) is included. Companion to
 * fetch-facility-by-code.js; keeps the URL/auth shape in one place.
 * @returns {Promise<any[] | null>} null on upstream failure
 */
export async function fetchAllFacilities() {
	const res = await fetch(`${PUBLIC_OE_API_URL}/facilities/`, {
		headers: { Authorization: `Bearer ${PUBLIC_OE_API_KEY}` }
	}).catch(() => null);
	if (!res?.ok) return null;
	const json = await res.json();
	return Array.isArray(json.data) ? json.data : [];
}
