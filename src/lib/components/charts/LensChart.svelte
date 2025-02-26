<script>
	import StackedAreaLineChartWithContext from '$lib/components/charts/StackedAreaLineChartWithContext.svelte';
	import ChartHeaderWithContext from '$lib/components/charts/ChartHeaderWithContext.svelte';
	import ChartTooltipWithContext from '$lib/components/charts/ChartTooltipWithContext.svelte';

	/** @typedef {{ data: TimeSeriesData, key?: string }} ChartEvent */

	/** @type {{
		cxtKey: symbol,
		displayOptions?: boolean,
		showHeader?: boolean,
		onmousemove?: (evt: ChartEvent | TimeSeriesData) => void,
		onmouseout?: () => void,
		onpointerup?: (evt: TimeSeriesData) => void
	}} */
	let props = $props();
	let { showHeader = true } = props;
</script>

<div>
	{#if showHeader}
		<ChartHeaderWithContext cxtKey={props.cxtKey} displayOptions={props.displayOptions} />
	{/if}
	<ChartTooltipWithContext cxtKey={props.cxtKey} />
	<div class="px-6">
		<StackedAreaLineChartWithContext {...props} />
	</div>
</div>
