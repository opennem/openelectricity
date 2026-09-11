/** CPI observations are quarterly indices labelled by quarter-end month. */
export const COMPARISON_CPI_SOURCE =
	'https://data.openelectricity.org.au/v4/stats/au/all/monthly.json';
/** @param {any} response */
export function parseComparisonCpi(response) {
	const history = response?.data?.find(
		(/** @type {any} */ series) => series.type === 'cpi'
	)?.history;
	if (!history || history.interval !== '1Q') throw new Error('CPI data unavailable');
	const date = new Date(history.start);
	const start = Date.UTC(date.getUTCFullYear(), Math.floor(date.getUTCMonth() / 3) * 3, 1);
	const values = /** @type {number[]} */ (history.data)
		.map((value, i) => ({
			time: Date.UTC(new Date(start).getUTCFullYear(), new Date(start).getUTCMonth() + i * 3, 1),
			value
		}))
		.filter((row) => Number.isFinite(row.value) && row.value > 0);
	if (!values.length) throw new Error('CPI data unavailable');
	const last = values.at(-1);
	if (!last) throw new Error('CPI data unavailable');
	return {
		values,
		reference: new Date(
			Date.UTC(new Date(last.time).getUTCFullYear(), new Date(last.time).getUTCMonth() + 2, 1)
		).toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
		error: null
	};
}
/** Adjust each monthly dollar component before annual/rolling aggregation.
 * Unknown CPI quarters remain gaps; never extrapolate the last known index.
 * @param {any[]} rows @param {{values:{time:number,value:number}[]} | null | undefined} cpi */
export function adjustComparisonInflation(rows, cpi) {
	const index = new Map((cpi?.values ?? []).map((row) => [row.time, row.value]));
	const latest = cpi?.values.at(-1)?.value;
	return rows.map((row) => {
		const date = new Date(row.time);
		const value = index.get(
			Date.UTC(date.getUTCFullYear(), Math.floor(date.getUTCMonth() / 3) * 3, 1)
		);
		return {
			...row,
			market_value_real:
				Number.isFinite(row.market_value) && latest && value
					? (row.market_value * latest) / value
					: null
		};
	});
}
