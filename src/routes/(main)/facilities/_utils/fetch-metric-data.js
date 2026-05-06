/**
 * Fetch the active metric's per-facility values via the batched API routes.
 * Returns a Map keyed by facility code so callers can look up arbitrary
 * facilities cheaply.
 *
 * Aborts cleanly via the passed AbortSignal — pair with `$effect` cleanup so
 * rapid metric switches don't leak in-flight requests.
 *
 * @param {{
 *   metric: 'capacity' | 'generation' | 'pollution' | 'emissions',
 *   category?: string,
 *   generationMode?: 'live' | 'daily',
 *   signal?: AbortSignal
 * }} params
 * @returns {Promise<Map<string, number>>}
 */
export async function fetchMetricData({ metric, category, generationMode, signal }) {
	if (metric === 'capacity' || metric === 'emissions') {
		// Capacity is computed locally from the facility list; emissions is
		// not yet wired up. Either way, no fetch.
		return new Map();
	}

	if (metric === 'generation') {
		const mode = generationMode === 'live' ? 'live' : 'daily';
		const r = await fetch(`/api/facilities/generation?mode=${mode}`, { signal });
		if (!r.ok) throw new Error(`generation: ${r.status}`);
		const json = await r.json();
		return new Map(Object.entries(json.values ?? {}));
	}

	if (metric === 'pollution') {
		const r = await fetch('/api/facilities/pollution', { signal });
		if (!r.ok) throw new Error(`pollution: ${r.status}`);
		const json = await r.json();
		const cat = category || 'air_pollutant';
		/** @type {Record<string, Record<string, number>>} */
		const byFacility = json.values ?? {};
		const out = new Map();
		for (const [code, byCat] of Object.entries(byFacility)) {
			const v = byCat[cat];
			if (typeof v === 'number' && v > 0) out.set(code, v);
		}
		return out;
	}

	return new Map();
}
