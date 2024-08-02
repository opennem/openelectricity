<script>
	import StackedAreaChart from '$lib/components/charts/StackedAreaChart.svelte';
	import Tooltip from './Tooltip.svelte';

	export let store;

	const {
		title,
		seriesData,
		seriesNames,
		seriesColours,
		seriesLabels,
		yDomain,
		xTicks,
		formatTickX,
		formatTickY,
		chartType,
		chartOverlay,
		chartOverlayLine,
		chartOverlayHatchStroke,
		chartHeightClasses,
		hoverKey,
		hoverData
	} = store;
</script>

<h5>{$title}</h5>
{#if $seriesNames.length}
	<Tooltip
		hoverData={$hoverData}
		hoverKey={$hoverKey}
		seriesColours={$seriesColours}
		seriesLabels={$seriesLabels}
		showTotal={true}
	/>

	<StackedAreaChart
		dataset={$seriesData}
		xKey="date"
		yKey={[0, 1]}
		zKey="key"
		xTicks={$xTicks}
		yDomain={$yDomain}
		seriesNames={$seriesNames}
		seriesColours={$seriesColours}
		formatTickX={$formatTickX}
		formatTickY={$formatTickY}
		chartType={$chartType}
		overlay={$chartOverlay}
		overlayLine={$chartOverlayLine}
		overlayStroke={$chartOverlayHatchStroke}
		hoverData={$hoverData}
		chartHeightClasses={$chartHeightClasses}
		on:mousemove
		on:mouseout
	/>
{/if}
