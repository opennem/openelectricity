<script>
	import ChartStore from '$lib/components/charts/v2/ChartStore.svelte.js';
	import GroupedBarChart from '$lib/components/charts/v2/GroupedBarChart.svelte';
	import { CATEGORY_META } from './pollution-constants.js';

	/** @type {{ data: import('./transform-pollution.js').PollutionData }} */
	let { data } = $props();

	/**
	 * Build a ChartStore instance for a single pollution category.
	 * @param {string} catKey
	 * @param {import('./transform-pollution.js').CategoryChartData} catData
	 * @returns {ChartStore}
	 */
	function buildChart(catKey, catData) {
		const chart = new ChartStore({ key: Symbol(catKey) });
		chart.isCategoryChart = true;
		chart.xKey = 'category';
		chart.seriesData = /** @type {any} */ (catData.data);
		chart.seriesNames = catData.seriesNames;
		chart.seriesColours = catData.seriesColours;
		chart.seriesLabels = catData.seriesLabels;
		chart.yKey = catData.seriesNames;
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

		for (const [catKey, catData] of Object.entries(data.chartDataByCategory)) {
			if (!catData.data.length) continue;

			const meta = CATEGORY_META[catKey];
			entries.push({
				key: catKey,
				label: meta?.label ?? catKey,
				unit: catData.unit,
				chart: buildChart(catKey, catData)
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
