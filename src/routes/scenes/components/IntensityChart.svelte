<script>
	import { getContext } from 'svelte';
	import Chart from './Chart.svelte';
	import Tooltip from './Tooltip.svelte';

	const {
		seriesData,
		seriesNames,
		seriesColours,
		seriesLabels,
		yDomain,
		xTicks,
		formatTickX,
		chartType,
		chartOverlay,
		chartOverlayLine,
		chartOverlayHatchStroke,
		hoverData
	} = getContext('intensity-data-viz');

	// $: console.log('seriesData', $seriesData);
</script>

{#if $seriesNames.length}
	<Tooltip
		hoverData={$hoverData}
		hoverKey="au.emission_intensity"
		seriesColours={$seriesColours}
		seriesLabels={$seriesLabels}
	/>

	<Chart
		dataset={$seriesData}
		xKey="date"
		yKey={[0, 1]}
		zKey="key"
		xTicks={$xTicks}
		yDomain={$yDomain}
		seriesNames={$seriesNames}
		seriesColours={$seriesColours}
		formatTickX={$formatTickX}
		chartType={$chartType}
		overlay={$chartOverlay}
		overlayLine={$chartOverlayLine}
		overlayStroke={$chartOverlayHatchStroke}
		hoverData={$hoverData}
		on:mousemove
		on:mouseout
	/>
{/if}
