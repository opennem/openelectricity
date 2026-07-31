/**
 * Chart processor: pairwise interconnector flows.
 *
 * Reduces a v4 market response carrying per-region `flow_imports`/`flow_exports`
 * (grouped by network_region) to chart-ready rows via the exact tree-topology
 * derivation in `$lib/flows/derive-pairwise.js`. Every corridor series is
 * emitted — the chart selects which one renders via `seriesNames`, so corridor
 * switching never reprocesses or refetches.
 *
 * Unlike the `/api/flows` snapshot route, no trailing-row trimming happens
 * here: per-region lag renders as a natural null tail on the chart.
 */

import { derivePairwiseFlows, PAIRWISE_KEYS } from '$lib/flows/derive-pairwise.js';
import { INTERCONNECTORS } from '$lib/flows/region-geo.js';
import { stripDateTimezone } from '$lib/utils/date-format.js';

/** Corridor line colour — matches the map arcs' base stroke. */
const CORRIDOR_COLOUR = '#5f7690';

const CORRIDOR_LABELS = Object.fromEntries(INTERCONNECTORS.map((ic) => [ic.key, ic.label]));

/**
 * @param {any} response - Raw API response ({ data: [{ metric, results }] })
 * @param {{ metricFilter?: 'flows' | 'flows_energy', networkTimezone?: string }} [config]
 * @returns {{ data: any[], seriesNames: string[], seriesColours: Record<string, string>, seriesLabels: Record<string, string> } | null}
 */
export function processPairwiseFlows(
	response,
	{ metricFilter = 'flows', networkTimezone = '+10:00' } = {}
) {
	const metricPair =
		metricFilter === 'flows_energy'
			? { importsMetric: 'flow_imports_energy', exportsMetric: 'flow_exports_energy' }
			: {};

	const { timestamps, series } = derivePairwiseFlows(response?.data ?? [], metricPair);
	if (timestamps.length === 0) return null;

	const data = timestamps.map((ts, i) => {
		const ms = new Date(stripDateTimezone(ts) + networkTimezone).getTime();
		/** @type {any} */
		const row = { date: new Date(ms), time: ms };
		for (const key of PAIRWISE_KEYS) row[key] = series[key][i];
		return row;
	});

	return {
		data,
		seriesNames: [...PAIRWISE_KEYS],
		seriesColours: Object.fromEntries(PAIRWISE_KEYS.map((key) => [key, CORRIDOR_COLOUR])),
		seriesLabels: { ...CORRIDOR_LABELS }
	};
}
