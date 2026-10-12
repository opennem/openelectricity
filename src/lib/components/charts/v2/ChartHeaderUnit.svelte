<script>
	/**
	 * ChartHeaderUnit — the unit beside a chart's title: the proportion
	 * basis while proportional, a button cycling the SI prefix (MW → GW) when
	 * the chart allows more than one, else the display unit. Shared by the
	 * grey `ChartHeader` bar and headers that host a chart's toolbar.
	 *
	 * @type {{ chart: import('./ChartStore.svelte.js').default }}
	 */
	let { chart } = $props();
</script>

{#if chart.chartOptions.isDataTransformTypeProportion}
	<span class="font-space font-light text-xxs text-mid-grey"
		>{chart.proportionContext?.label ?? '%'}</span
	>
{:else if chart.chartOptions.allowPrefixSwitch}
	<button
		class="font-space font-light text-xxs text-mid-grey hover:underline"
		onclick={() => chart.chartOptions.cyclePrefix()}
	>
		{chart.chartOptions.displayUnit}
	</button>
{:else if chart.chartOptions.displayUnit}
	<span class="font-space font-light text-xxs text-mid-grey">
		{chart.chartOptions.displayUnit}
	</span>
{/if}
