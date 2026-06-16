import energyParser from '$lib/opennem/parser';

/**
 * Fetch the legacy OpenNEM static-JSON energy data via the local `/api/energy`
 * route and run it through `energyParser`. Used as the `legacy_opennem` baseline
 * option on /studio/renewables (the homepage hero now uses the live OE API).
 *
 * @param {typeof fetch} fetchFn
 * @returns {Promise<StatsData[]>}
 */
export async function fetchLegacyOpenNemFueltechStats(fetchFn) {
	try {
		const res = await fetchFn('/api/energy');
		if (!res.ok) {
			console.error(`Legacy /api/energy fetch failed: ${res.status}`);
			return [];
		}
		const json = await res.json();
		return json?.data ? energyParser(json.data) : [];
	} catch (e) {
		console.error('Failed to fetch legacy /api/energy:', e);
		return [];
	}
}
