import energyParser from '$lib/opennem/parser';

/**
 * Fetch the legacy OpenNEM static-JSON energy data via the local `/api/energy`
 * route and run it through `energyParser`. Used as the homepage hero's only
 * data source, and as the baseline option on /studio/renewables.
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

/**
 * Renewables-calculator input for callers that only need the legacy OpenNEM
 * baseline (e.g. the homepage hero, which renders solely the `legacy_opennem`
 * mode). Mirrors the `{ data, error }` envelope returned by
 * `fetchRenewablesInput` so route loaders can stay one-liners.
 *
 * @param {typeof fetch} fetchFn
 */
export async function fetchLegacyRenewablesInput(fetchFn) {
	const legacyFueltechStats = await fetchLegacyOpenNemFueltechStats(fetchFn);
	return {
		data: { marketStats: [], legacyFueltechStats },
		error: legacyFueltechStats.length === 0 ? "Couldn't load renewables data" : null
	};
}
