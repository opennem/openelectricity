<script>
	import { getContext } from 'svelte';

	import MiniChart from './MiniChart.svelte';

	const {
		seriesData: energySeriesData,
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
		hoverKey,
		hoverData
	} = getContext('energy-data-viz');

	$: keys = [...$seriesNames].reverse();

	$: console.log('energySeriesData', $energySeriesData);
</script>

<div class="grid grid-cols-3 border-mid-warm-grey gap-12">
	{#each keys as key}
		<MiniChart {key} colour={$seriesColours[key]} />
	{/each}
</div>
