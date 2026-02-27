<script>
	import StratumChart from '$lib/components/charts/v2/StratumChart.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {import('$lib/components/charts/v2/ChartStore.svelte.js').default} chart
	 * @property {string} [title]
	 * @property {string} [description]
	 * @property {string} [dataSource]
	 * @property {string} [notes]
	 */

	/** @type {Props} */
	let { chart, title = '', description = '', dataSource = '', notes = '' } = $props();

	$effect(() => {
		chart.chartStyles.chartHeightClasses = 'h-[calc(100vh-280px)]';
	});
</script>

<div class="chart-preview">
	<StratumChart {chart} showOptions={false} enablePan={false}>
		{#snippet header()}
			{#if title || description}
				<div class="mb-2 px-1">
					{#if title}
						<h3 class="text-base font-semibold leading-tight">{title}</h3>
					{/if}
					{#if description}
						<p class="text-xs text-mid-grey mt-1">{description}</p>
					{/if}
				</div>
			{/if}
		{/snippet}

		{#snippet footer()}
			{#if dataSource || notes}
				<div class="mt-3 px-1 space-y-1">
					{#if notes}
						<p class="text-xs text-mid-grey italic">{notes}</p>
					{/if}
					{#if dataSource}
						<p class="text-xs text-mid-warm-grey">Source: {dataSource}</p>
					{/if}
				</div>
			{/if}
		{/snippet}
	</StratumChart>
</div>
