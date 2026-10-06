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
 * Where each combined region falls among the ranked regions that period: on
 * a rank it ties (an integer), or halfway between the ranks either side
 * (`2.5` between #2 and #3; `0.5` above #1, `n + 0.5` below the last). Null
 * without its own value or any ranked value.
 * @param {Array<{date: Date, time: number} & Record<string, any>>} rows
 * @param {string[]} ranked - The ranked regions @param {string[]} benchmarks
 * @returns {Array<{date: Date, time: number} & Record<string, number | null>>} */
export function benchmarkRankRows(rows, ranked, benchmarks) {
	return rows.map((row) => {
		const values = ranked.map((id) => row[id]).filter(Number.isFinite);
		/** @type {{date: Date, time: number} & Record<string, number | null>} */
		const placed = /** @type {any} */ ({ date: row.date, time: row.time });
		for (const id of benchmarks) {
			const value = row[id];
			if (!Number.isFinite(value) || !values.length) {
				placed[id] = null;
				continue;
			}
			const above = values.filter((other) => other > value).length;
			placed[id] = above + (values.includes(value) ? 1 : 0.5);
		}
		return placed;
	});
}
/** A reference line's place among `count` ranks: `#2` on a tie, `#2–3`
 * between two, `above #1` or `below #6` at either end.
 * @param {number} position - From `benchmarkRankRows` @param {number} count */
export function formatBenchmarkRank(position, count) {
	if (Number.isInteger(position)) return `#${position}`;
	const above = Math.floor(position);
	if (above < 1) return 'above #1';
	if (above >= count) return `below #${count}`;
	return `#${above}–${above + 1}`;
}
