/**
 * Derive pairwise interconnector flows from the OE v4 per-region flow metrics.
 *
 * The v4 API serves only net `flow_imports`/`flow_exports` per region — no
 * pairwise interconnector metric. But the NEM interconnector graph is a tree
 * (QLD—NSW—VIC, VIC—SA, VIC—TAS), so per-region net positions uniquely
 * determine every corridor flow:
 *
 *   NSW1->QLD1 =  net(QLD1)                          (QLD trades only with NSW)
 *   SA1->VIC1  = -net(SA1)                           (SA trades only with VIC)
 *   TAS1->VIC1 = -net(TAS1)                          (TAS trades only with VIC)
 *   NSW1->VIC1 =  net(VIC1) + net(SA1) + net(TAS1)   (VIC balance minus SA/TAS legs)
 *
 * where net(R) = imports(R) − exports(R) (positive = importing) and a positive
 * pairwise value flows in the key's direction — matching the retired legacy
 * flows API that the homepage and tracker consume.
 *
 * Verified against live data: the API's per-region values are exactly
 * self-consistent (e.g. QLD's exports equal NSW's imports to the sample), so
 * the derivation is exact, not an approximation.
 */

/** Directed corridor keys in the legacy payload order. */
export const PAIRWISE_KEYS = ['NSW1->QLD1', 'NSW1->VIC1', 'SA1->VIC1', 'TAS1->VIC1'];

/**
 * Collect per-region series for one metric out of a v4 market response.
 * @param {any[]} apiData - The v4 response `data` array ({ metric, results } entries)
 * @param {string} metric
 * @returns {Map<string, Map<string, number>>} region → (timestamp ISO string → value)
 */
function collectRegionSeries(apiData, metric) {
	/** @type {Map<string, Map<string, number>>} */
	const byRegion = new Map();
	for (const entry of apiData || []) {
		if (entry.metric !== metric) continue;
		for (const series of entry.results || []) {
			const region = series.columns?.region ?? series.columns?.network_region;
			if (!region) continue;
			let valueMap = byRegion.get(region);
			if (!valueMap) {
				valueMap = new Map();
				byRegion.set(region, valueMap);
			}
			for (const [timestamp, value] of series.data || []) {
				if (value == null) continue;
				valueMap.set(timestamp, value);
			}
		}
	}
	return byRegion;
}

/**
 * Derive the four pairwise corridor series from a v4 market response carrying
 * `flow_imports` + `flow_exports` grouped by network region.
 *
 * @param {any[]} apiData - The v4 response `data` array
 * @returns {{ timestamps: string[], series: Record<string, (number | null)[]> }}
 *   Timestamps sorted ascending; a derived sample is null when any region it
 *   depends on is missing that timestamp.
 */
export function derivePairwiseFlows(apiData) {
	const imports = collectRegionSeries(apiData, 'flow_imports');
	const exports_ = collectRegionSeries(apiData, 'flow_exports');

	/** @type {Set<string>} */
	const timestampSet = new Set();
	for (const valueMap of imports.values()) for (const ts of valueMap.keys()) timestampSet.add(ts);
	for (const valueMap of exports_.values()) for (const ts of valueMap.keys()) timestampSet.add(ts);
	const timestamps = [...timestampSet].sort();

	/** Net import for a region at a timestamp, or null when either side is absent. */
	/** @param {string} region @param {string} ts @returns {number | null} */
	const net = (region, ts) => {
		const im = imports.get(region)?.get(ts);
		const ex = exports_.get(region)?.get(ts);
		if (im === undefined || ex === undefined) return null;
		return im - ex;
	};

	/** @type {Record<string, (number | null)[]>} */
	const series = Object.fromEntries(PAIRWISE_KEYS.map((k) => [k, []]));

	for (const ts of timestamps) {
		const qld = net('QLD1', ts);
		const sa = net('SA1', ts);
		const tas = net('TAS1', ts);
		const vic = net('VIC1', ts);

		series['NSW1->QLD1'].push(qld);
		series['SA1->VIC1'].push(sa === null ? null : -sa);
		series['TAS1->VIC1'].push(tas === null ? null : -tas);
		series['NSW1->VIC1'].push(vic === null || sa === null || tas === null ? null : vic + sa + tas);
	}

	return { timestamps, series };
}

/**
 * Trim trailing timestamps down to the last row where every series has a
 * value, so consumers reading "the latest sample" all land on the same,
 * complete dispatch interval (the newest 5m bucket can lag per region).
 * Interior nulls are preserved; if no complete row exists, input is returned
 * unchanged.
 *
 * @param {string[]} timestamps
 * @param {Record<string, (number | null)[]>} series
 * @returns {{ timestamps: string[], series: Record<string, (number | null)[]> }}
 */
export function trimToLastCompleteRow(timestamps, series) {
	const names = Object.keys(series);
	if (names.length === 0) return { timestamps, series };

	for (let i = timestamps.length - 1; i >= 0; i--) {
		if (names.every((name) => series[name][i] != null)) {
			if (i === timestamps.length - 1) return { timestamps, series };
			return {
				timestamps: timestamps.slice(0, i + 1),
				series: Object.fromEntries(names.map((name) => [name, series[name].slice(0, i + 1)]))
			};
		}
	}
	return { timestamps, series };
}

/**
 * Shape derived (or plain per-region) series into the legacy stats payload the
 * flows/prices consumers expect: `{ data: [{ code, history: { last, data } }] }`.
 *
 * @param {string[]} timestamps - Sorted ISO timestamp strings
 * @param {Record<string, (number | null)[]>} series - code → values aligned to timestamps
 * @param {string} [interval]
 * @returns {{ data: { code: string, history: { start: string, last: string, interval: string, data: (number | null)[] } }[] }}
 */
export function toLegacyPayload(timestamps, series, interval = '5m') {
	if (timestamps.length === 0) return { data: [] };
	const start = timestamps[0];
	const last = timestamps[timestamps.length - 1];
	return {
		data: Object.entries(series).map(([code, data]) => ({
			code,
			history: { start, last, interval, data }
		}))
	};
}

/**
 * Collect one metric's per-region series into aligned legacy-payload inputs
 * (used by the prices adapter).
 *
 * @param {any[]} apiData - The v4 response `data` array
 * @param {string} metric
 * @returns {{ timestamps: string[], series: Record<string, (number | null)[]> }}
 */
export function collectRegionSeriesAligned(apiData, metric) {
	const byRegion = collectRegionSeries(apiData, metric);

	/** @type {Set<string>} */
	const timestampSet = new Set();
	for (const valueMap of byRegion.values()) for (const ts of valueMap.keys()) timestampSet.add(ts);
	const timestamps = [...timestampSet].sort();

	/** @type {Record<string, (number | null)[]>} */
	const series = {};
	for (const [region, valueMap] of byRegion) {
		series[region] = timestamps.map((ts) => valueMap.get(ts) ?? null);
	}
	return { timestamps, series };
}
