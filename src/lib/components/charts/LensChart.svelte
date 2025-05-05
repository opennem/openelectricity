<script>
	import StackedAreaLineChartWithContext from '$lib/components/charts/StackedAreaLineChartWithContext.svelte';
	import ChartHeaderWithContext from '$lib/components/charts/ChartHeaderWithContext.svelte';
	import ChartTooltipWithContext from '$lib/components/charts/ChartTooltipWithContext.svelte';

	/** @typedef {{ data: TimeSeriesData, key?: string }} ChartEvent */
	/** @type {{
		cxtKey: symbol,
		displayOptions?: boolean,
		showHeader?: boolean,
		showTooltip?: boolean,
		onmousemove?: (evt: ChartEvent | TimeSeriesData) => void,
		onmouseout?: () => void,
		onpointerup?: (evt: TimeSeriesData) => void,
		tooltipWrapperStyles?: string,
		chartPaddingClasses?: string,
		customHeader?: () => any,
		customTooltips?: () => any
	}} */
	let props = $props();
	let {
		showHeader = true,
		showTooltip = true,
		chartPaddingClasses = 'px-6',
		customHeader,
		customTooltips
	} = props;
</script>

<div>
	{#if showHeader}
		<ChartHeaderWithContext cxtKey={props.cxtKey} displayOptions={props.displayOptions} />
	{/if}
	{#if customHeader}
		{@render customHeader()}
	{/if}
	{#if showTooltip}
		<div style="padding-right: var(--pad-right); z-index: 10; position: relative;">
			<ChartTooltipWithContext cxtKey={props.cxtKey} wrapperStyles={props.tooltipWrapperStyles} />
		</div>
	{/if}
	{#if customTooltips}
		{@render customTooltips()}
	{/if}
	<div class={chartPaddingClasses}>
		<StackedAreaLineChartWithContext {...props} />
	</div>
</div>
