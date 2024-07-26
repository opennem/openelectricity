<script>
	import { getContext } from 'svelte';
	import Chart from './Chart.svelte';

	const {
		seriesData,
		seriesNames,
		seriesColours,
		seriesLabels,
		nameOptions,
		yDomain,
		xTicks,
		formatTickX,
		chartType,
		chartOverlay,
		chartOverlayLine,
		chartOverlayHatchStroke
	} = getContext('emissions-data-viz');

	// $: console.log('seriesData', $seriesData);
	// $: console.log('seriesNames', $seriesNames);
	// $: console.log('seriesColours', $seriesColours);
	// $: console.log('seriesLabels', $seriesLabels);
	// $: console.log('nameOptions', $nameOptions);
	// $: console.log('yDomain', $yDomain);
	// $: console.log('xTicks', $xTicks);
	// $: console.log('formatTickX', $formatTickX);
	// $: console.log('chartType', $chartType);
	// $: console.log('chartOverlay', $chartOverlay);
	// $: console.log('chartOverlayLine', $chartOverlayLine);
	// $: console.log('chartOverlayHatchStroke', $chartOverlayHatchStroke);
</script>

{#if $seriesNames.length}
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
	/>
{/if}

<!-- <Chart
				id="scenarios-explorer-chart"
				dataset={seriesData}
				xKey="date"
				yKey={[0, 1]}
				zKey="key"
				{xTicks}
				{yDomain}
				seriesNames={sortedItems}
				{seriesColours}
				formatTickX={formatFyTickX}
				{display}
				{overlay}
				{blankOverlay}
				{overlayLine}
				{hoverData}
				{highlightId}
				{overlayStroke}
				on:mousemove={handleMousemove}
				on:mouseout={() => {
					hoverKey = undefined;
					hoverData = undefined;
				}}
			/> -->
