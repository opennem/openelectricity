<script>
	import checkAndGetContext from '$lib/utils/check-and-get-context.js';
	import StackedAreaChartWithContext from '$lib/components/charts/StackedAreaChartWithContext.svelte';

	/** @typedef {{ data: TimeSeriesData, key?: string }} ChartEvent */

	/** @type {{
		cxtKey: symbol,
		onmousemove: (evt: ChartEvent) => void,
		onmouseout: () => void,
		onpointerup: (evt: ChartEvent) => void
	}} */
	let props = $props();
	/** @type {import('$lib/components/charts/states/chart.svelte.js').default} */
	let cxt = checkAndGetContext(props.cxtKey);

	$inspect('lens chart title', cxt.title);
	$inspect('lens chart series scaled data', cxt.seriesScaledData);
</script>

<div class="p-10">
	{#if cxt.seriesScaledData.length > 0}
		<StackedAreaChartWithContext {...props} />
	{/if}
</div>
