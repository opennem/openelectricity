/**
 * Load solar heatmap data for all years
 * @type {import('./$types').PageLoad}
 */
export async function load({ fetch }) {
	const years = Array.from({ length: 13 }, (_, i) => 2013 + i); // 2013–2025
	const entries = await Promise.all(
		years.map(async (year) => {
			const res = await fetch(`/data/solar-heatmap/${year}.json`);
			return [year, await res.json()];
		})
	);
	return { yearData: Object.fromEntries(entries) };
}
