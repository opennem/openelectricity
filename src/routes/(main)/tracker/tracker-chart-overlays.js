import { displayFullTransform } from '$lib/components/charts/v2/dataProcessing.js';
import {
	applyBucketFilterToDisplayRows,
	bucketFilterPredicate,
	bucketFilterKindFor
} from '$lib/components/charts/v2/bucket-filter.js';
import {
	RENEWABLES_SERIES_ID,
	DEMAND_GROSS_SERIES_ID
} from '$lib/components/charts/network/market-series-ids.js';
/** One year of lead-in plus room for half-year bucket alignment. */
export const ROLLING_LEAD_MS = 580 * 86_400_000;

/**
 * Derive rolling renewable share from renewable and demand window sums.
 * @param {any[]} rows
 * @param {{startMs: number, endMs: number, displayInterval: string, ianaTimeZone: string, bucketFilter: string | null}} options
 */
export function rollingShareRows(
	rows,
	{ startMs, endMs, displayInterval, ianaTimeZone, bucketFilter }
) {
	const transform = displayFullTransform({
		apiInterval: '1M',
		displayInterval: displayInterval,
		method: 'sum',
		ianaTimeZone
	});
	if (!transform) return [];
	const rolled = transform(rows, [RENEWABLES_SERIES_ID, DEMAND_GROSS_SERIES_ID]);
	const samplePredicate = bucketFilterPredicate(
		bucketFilterKindFor(displayInterval),
		bucketFilter,
		ianaTimeZone
	);
	/** @type {any[]} */
	const out = [];
	for (const row of rolled) {
		if (row.time < startMs || row.time > endMs) continue;
		const renewables = row[RENEWABLES_SERIES_ID];
		const demand = row[DEMAND_GROSS_SERIES_ID];
		out.push({
			date: row.date,
			time: row.time,
			renewable_share:
				typeof renewables === 'number' && typeof demand === 'number' && demand > 0
					? (renewables / demand) * 100
					: null
		});
	}
	return applyBucketFilterToDisplayRows(out, samplePredicate, ianaTimeZone);
}
