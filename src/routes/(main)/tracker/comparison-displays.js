/**
 * Pure transforms behind Compare's displays beyond Trends and Heatmap. They
 * take the wide per-card rows (`comparisonChartRows`: `{date, time,
 * [region]: number | null}`) and reshape them; nothing here fetches.
 */

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
