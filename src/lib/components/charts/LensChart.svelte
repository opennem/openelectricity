<script>
	import StackedAreaLineChartWithContext from '$lib/components/charts/StackedAreaLineChartWithContext.svelte';
	import ChartHeaderWithContext from '$lib/components/charts/ChartHeaderWithContext.svelte';
	import ChartTooltipWithContext from '$lib/components/charts/ChartTooltipWithContext.svelte';

	/** @typedef {{ data: TimeSeriesData, key?: string }} ChartEvent */

	/** @type {{
		cxtKey: symbol,
		displayOptions: boolean,
		onmousemove: (evt: ChartEvent | TimeSeriesData) => void,
		onmouseout: () => void,
		onpointerup: (evt: TimeSeriesData) => void
	}} */
	let props = $props();
</script>

<ChartHeaderWithContext cxtKey={props.cxtKey} displayOptions={props.displayOptions} />
<ChartTooltipWithContext cxtKey={props.cxtKey} />
<StackedAreaLineChartWithContext {...props} />
