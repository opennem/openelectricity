<script>
	import StackedAreaChart from '$lib/components/charts/StackedAreaChart.svelte';
	import Tooltip from './Tooltip.svelte';

	export let store;
	/** @type {string[]} */
	export let hiddenRowNames = [];

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

	$: names = $seriesNames.filter((/** @type {string} */ d) => !hiddenRowNames.includes(d));
	$: colours = names.map((/** @type {string} */ d) => $seriesColours[d]);
	$: console.log('seriesColours', colours);

	// Object.values(seriesColours)
</script>

<h5>{$title}</h5>
{#if names.length}
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
		seriesNames={names}
		zRange={colours}
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
