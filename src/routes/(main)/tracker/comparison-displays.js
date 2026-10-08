/**
 * Pure transforms behind Compare's displays beyond Trends and Heatmap. They
 * take the wide per-card rows (`comparisonChartRows`: `{date, time,
 * [region]: number | null}`) and reshape them; nothing here fetches.
 */
import { comparisonMetric } from './comparison-metrics.js';

/** NEM and All Regions contain the states (and WEM), so they are not ranked
 * against them: Ranks draws them as reference lines instead. */
export const COMBINED_REGIONS = ['_all', 'au'];
/** The selected regions Ranks ranks: the states and WEM, in selection order.
 * @param {string[]} regions */
export function rankedComparisonRegions(regions) {
	return regions.filter((id) => !COMBINED_REGIONS.includes(id));
}
/** The selected combined regions, drawn as references among the ranks.
 * @param {string[]} regions */
export function benchmarkComparisonRegions(regions) {
	return regions.filter((id) => COMBINED_REGIONS.includes(id));
}
/** Volumes (generation and emissions) mostly measure a region's size, so
 * their ranks barely move; Ranks ranks ratios only.
 * @param {string} metric - A comparison chart id */
export function isRankableComparisonMetric(metric) {
	const { kind } = comparisonMetric(metric);
	return kind !== 'energy' && kind !== 'emissions';
}

/**
 * Each region's rank among the regions with a value that period, 1 for the
 * highest: competition ranking, so tied regions share a rank and the next
 * rank skips (1, 2, 2, 4). A region without a value is unranked (null).
 * @template {{date: Date, time: number}} Row
 * @param {Array<Row & Record<string, any>>} rows @param {string[]} regions
 * @returns {Array<{date: Date, time: number} & Record<string, number | null>>} */
export function rankComparisonRows(rows, regions) {
	return rows.map((row) => {
		const values = regions.map((id) => row[id]).filter(Number.isFinite);
		/** @type {{date: Date, time: number} & Record<string, number | null>} */
		const ranked = /** @type {any} */ ({ date: row.date, time: row.time });
		for (const id of regions) {
			const value = row[id];
			ranked[id] = Number.isFinite(value)
				? 1 + values.filter((other) => other > value).length
				: null;
		}
		return ranked;
	});
}

/**
 * Where each combined region falls among the ranked regions that period, by
 * their competition ranks (`rankComparisonRows`) among the regions reporting
 * then: on the rank it ties, or halfway between the ranks either side, half a
 * rank above #1 or below the last. `labels` reads each place for the tooltip
 * (`#2`, `#2–3`, `above #1`, `below #4`); a tie above shares its rank, so 10,
 * 10, 5 with a reference at 7 reads `#1–3`. Null (and no label) without its
 * own value or any ranked value.
 * @param {Array<{date: Date, time: number} & Record<string, any>>} rows
 * @param {string[]} ranked - The ranked regions @param {string[]} benchmarks
 * @returns {Array<{date: Date, time: number, labels: Record<string, string>} & Record<string, any>>} */
export function benchmarkRankRows(rows, ranked, benchmarks) {
	return rows.map((row) => {
		const values = ranked.map((id) => row[id]).filter(Number.isFinite);
		/** Competition rank of a reported value. @param {number} value */
		const rankOf = (value) => 1 + values.filter((other) => other > value).length;
		/** @type {Record<string, string>} */
		const labels = {};
		/** @type {any} */
		const placed = { date: row.date, time: row.time, labels };
		for (const id of benchmarks) {
			const value = row[id];
			placed[id] = null;
			if (!Number.isFinite(value) || !values.length) continue;
			const above = values.filter((other) => other > value);
			const below = values.filter((other) => other < value);
			if (values.includes(value)) {
				placed[id] = rankOf(value);
				labels[id] = `#${placed[id]}`;
			} else if (!above.length) {
				placed[id] = 0.5;
				labels[id] = 'above #1';
			} else {
				const rankAbove = rankOf(Math.min(...above));
				if (!below.length) {
					placed[id] = rankAbove + 0.5;
					labels[id] = `below #${rankAbove}`;
				} else {
					const rankBelow = rankOf(Math.max(...below));
					placed[id] = (rankAbove + rankBelow) / 2;
					labels[id] = `#${rankAbove}–${rankBelow}`;
				}
			}
		}
		return placed;
	});
}

/**
 * The Regions table's row order while Ranks shows, matching one card's ranks
 * that period: the ranked regions by rank (#1, the highest, first; ties keep
 * the list order), NEM and All Regions where their reference line sits (just
 * after the ranks they tie), then selected regions without a value that
 * period, then the unselected — each in list order. With nothing ranked that
 * period the list order stands.
 * @param {string[]} order - Every region, in list order
 * @param {string[]} selected
 * @param {(id: string) => number | null} valueOf - The card's value that period
 * @returns {string[]} */
export function rankedRegionOrder(order, selected, valueOf) {
	const ranked = rankedComparisonRegions(selected);
	const benchmarks = benchmarkComparisonRegions(selected);
	/** @type {{date: Date, time: number} & Record<string, any>} */
	const row = {
		date: new Date(0),
		time: 0,
		...Object.fromEntries(selected.map((id) => [id, valueOf(id)]))
	};
	const [ranks] = rankComparisonRows([row], ranked);
	const [places] = benchmarkRankRows([row], ranked, benchmarks);
	/** @type {Map<string, number>} */
	const keys = new Map();
	for (const id of ranked) if (ranks[id] != null) keys.set(id, ranks[id]);
	for (const id of benchmarks) {
		if (places[id] == null) continue;
		const tied = ranked.some((other) => row[other] === row[id]);
		keys.set(id, tied ? places[id] + 0.25 : places[id]);
	}
	// Nothing ranked that period (NEM alone, or no values): the list order.
	if (!keys.size) return order;
	const placed = order
		.filter((id) => keys.has(id))
		.sort((a, b) => /** @type {number} */ (keys.get(a)) - /** @type {number} */ (keys.get(b)));
	return [
		...placed,
		...order.filter((id) => selected.includes(id) && !keys.has(id)),
		...order.filter((id) => !selected.includes(id))
	];
}
