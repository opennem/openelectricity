import { DEMAND_GROSS_SERIES_ID } from './market-series-ids.js';

/** Contribution membership is shared by chart buckets and table windows.
 * @param {string[]} names
 * @param {string[]} loads
 * @param {'generation' | 'demand'} mode
 */
export function contributionSeries(names, loads, mode) {
	return names.filter((name) => !loads.includes(name) && (mode === 'demand' || name !== 'imports'));
}

/** Missing values are not zero contributions. No upper clamp: demand shares
 * and curtailment above the stack can legitimately exceed 100%.
 * @param {unknown} value
 * @param {unknown} denominator
 * @param {number} [epsilon]
 * @returns {number | null}
 */
export function contributionPercent(value, denominator, epsilon = 0) {
	return typeof value === 'number' &&
		Number.isFinite(value) &&
		typeof denominator === 'number' &&
		Number.isFinite(denominator) &&
		denominator > epsilon
		? (value / denominator) * 100
		: null;
}

/** Build one timestamp lookup after both datasets reach the display grain.
 * The same transform serves generation rows and independently fetched overlays.
 * No visibility input: hiding a series must not renormalise its neighbours.
 * @param {{generationRows: any[], demandRows: any[], seriesNames: string[],
 * loadSeriesIds: string[], mode: 'generation' | 'demand', ready?: boolean}} input
 * @returns {import('../v2/ChartStore.svelte.js').ProportionContext}
 */
export function createContributionContext({
	generationRows,
	demandRows,
	seriesNames,
	loadSeriesIds,
	mode,
	ready = true
}) {
	const sources = contributionSeries(seriesNames, loadSeriesIds, 'generation');
	const included = contributionSeries(seriesNames, loadSeriesIds, mode);
	const denominators = new Map();
	if (ready) {
		if (mode === 'demand') {
			for (const row of demandRows) denominators.set(row.time, row[DEMAND_GROSS_SERIES_ID]);
		} else {
			for (const row of generationRows) {
				const values = sources.map((name) => row[name]).filter((value) => value != null);
				denominators.set(
					row.time,
					values.length ? values.reduce((sum, value) => sum + value, 0) : null
				);
			}
		}
	}
	return {
		label: mode === 'generation' ? '% of generation' : '% of gross demand',
		excludedSeriesNames: seriesNames.filter((name) => !included.includes(name)),
		transform(row, keys) {
			return {
				...row,
				...Object.fromEntries(
					keys.map((key) => [key, contributionPercent(row[key], denominators.get(row.time))])
				)
			};
		}
	};
}
