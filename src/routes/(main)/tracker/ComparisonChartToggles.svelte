<script>
	import FilterDropdown from '$lib/components/filters/FilterDropdown.svelte';
	import {
		COMPARISON_CHART_OPTIONS,
		COMPARISON_METRIC_GROUPS,
		DEFAULT_COMPARISON_CHARTS,
		comparisonChartId,
		selectComparisonCharts
	} from './comparison-metrics.js';

	/**
	 * The Compare charts strip under the top nav, as Profile's breakdown
	 * options sit: one multi-select dropdown per group (Emissions, Generation,
	 * Prices). Ticking a chart shows or hides it at once (`immediate`), so the
	 * panel's button is Done; ⌘/Ctrl-click keeps that chart alone within its
	 * group. A chart switched off and back on returns in the presentation it
	 * had (generation, excluding batteries, nominal) for this visit.
	 *
	 * @type {{ selected: string[], onchange: (charts: string[]) => void }}
	 */
	let { selected, onchange } = $props();

	const GROUPS = COMPARISON_METRIC_GROUPS.map((group) => {
		const charts = COMPARISON_CHART_OPTIONS.filter((option) => option.group === group);
		return {
			group,
			ids: charts.map(({ id }) => id),
			options: charts.map(({ id, label }) => ({ value: id, label }))
		};
	});

	let shown = $derived(selected.map(comparisonChartId));
	let isDefault = $derived(shown.join(',') === DEFAULT_COMPARISON_CHARTS.join(','));
	/** Each chart's last presentation, by chart id: a session-only nicety. */
	const remembered = /** @type {Record<string, string>} */ ({});

	/** Replace one group's charts, keeping the other groups'.
	 * @param {string[]} ids - The group's chart ids @param {string[]} chosen */
	function choose(ids, chosen) {
		for (const id of selected) {
			const chart = comparisonChartId(id);
			if (ids.includes(chart) && !chosen.includes(chart)) remembered[chart] = id;
		}
		const others = shown.filter((chart) => !ids.includes(chart));
		onchange(selectComparisonCharts([...others, ...chosen], selected, remembered));
	}
</script>

<section
	aria-label="Charts"
	class="axis-ticks-bg flex shrink-0 items-center gap-2 overflow-x-auto border-b border-warm-grey bg-white px-8 py-2"
>
	{#each GROUPS as { group, ids, options } (group)}
		<FilterDropdown
			label={group}
			{options}
			selected={shown.filter((chart) => ids.includes(chart))}
			immediate
			compact
			onapply={(chosen) => choose(ids, chosen)}
		/>
	{/each}
	{#if !isDefault}
		<button
			type="button"
			class="shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs text-mid-grey transition-colors hover:bg-light-warm-grey hover:text-black"
			onclick={() => onchange([...DEFAULT_COMPARISON_CHARTS])}>Reset charts</button
		>
	{/if}
</section>
