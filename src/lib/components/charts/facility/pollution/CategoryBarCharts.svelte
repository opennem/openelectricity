<script>
	import ChartStore from '$lib/components/charts/v2/ChartStore.svelte.js';
	import GroupedBarChart from '$lib/components/charts/v2/GroupedBarChart.svelte';
	import { CATEGORY_META } from './pollution-constants.js';
	import { buildCategoryMeta } from './transform-pollution.js';

	/** @type {{ data: import('./transform-pollution.js').PollutionData }} */
	let { data } = $props();

	/**
	 * @param {string} catKey
	 * @param {import('./transform-pollution.js').PollutantSeries[]} pollutants
	 * @param {string[]} years
	 * @returns {ChartStore}
	 */
	function buildChart(catKey, pollutants, years) {
		const meta = buildCategoryMeta(catKey, pollutants);
		// Category-mode rows: `category` is the year string used as the x-axis
		// band, `time` is the row index, `date` is Jan 1 of that year (the
		// existing GroupedBarChart contract). Null pollutant values fall back
		// to 0 so the stacked bars render contiguously.
		const rows = years.map((year, i) => {
			/** @type {Record<string, any>} */
			const row = { category: year, time: i, date: new Date(Number(year), 0, 1) };
			for (const p of pollutants) row[p.code] = p.values[year] ?? 0;
			return row;
		});

		const chart = new ChartStore({ key: Symbol(catKey) });
		chart.isCategoryChart = true;
		chart.xKey = 'category';
		chart.seriesData = /** @type {any} */ (rows);
		chart.seriesNames = meta.seriesNames;
		chart.seriesColours = meta.seriesColours;
		chart.seriesLabels = meta.seriesLabels;
		chart.yKey = meta.seriesNames;
		chart.hideDataOptions = true;
		chart.hideChartTypeOptions = true;
		chart.chartStyles.chartHeightPx = 250;
		return chart;
	}

	/**
	 * @typedef {Object} CategoryEntry
	 * @property {string} key
	 * @property {string} label
	 * @property {string} unit
	 * @property {ChartStore} chart
	 */

	/** @type {CategoryEntry[]} */
	let categoryEntries = $derived.by(() => {
		const entries = [];

		for (const [catKey, pollutants] of Object.entries(data.byCategory)) {
			if (!pollutants.length) continue;

			const meta = CATEGORY_META[catKey];
			entries.push({
				key: catKey,
				label: meta?.label ?? catKey,
				unit: pollutants[0]?.unit ?? '',
				chart: buildChart(catKey, pollutants, data.years)
			});
		}

		return entries;
	});
</script>

<div class="space-y-6">
	{#each categoryEntries as entry (entry.key)}
		<div>
			<div
				class="text-[10px] text-mid-grey uppercase tracking-widest mb-2 pb-1 border-b border-warm-grey/60"
			>
				{entry.label} ({entry.unit})
			</div>

			<GroupedBarChart chart={entry.chart} />
		</div>
	{/each}
</div>
