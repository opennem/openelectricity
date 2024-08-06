<script>
	import LineChart from '$lib/components/charts/LineChart.svelte';

	export let seriesNames;
	export let seriesLabels;
	export let seriesColours;
	export let xTicks;
	export let formatTickX;
	export let formatTickY;
	export let chartOverlay;
	export let chartOverlayLine;
	export let chartOverlayHatchStroke;
	export let hoverData;
	export let seriesData;

	$: keys = [...seriesNames].reverse();
</script>

<div class="grid grid-cols-3 border-mid-warm-grey gap-12">
	{#each keys as key}
		<div>
			<h5>{seriesLabels[key]}</h5>
			<LineChart
				dataset={seriesData}
				xKey="date"
				yKey={key}
				zKey={seriesColours[key]}
				{xTicks}
				{formatTickX}
				{formatTickY}
				overlay={chartOverlay}
				overlayLine={chartOverlayLine}
				overlayStroke={chartOverlayHatchStroke}
				{hoverData}
				chartHeightClasses="h-[150px]"
				on:mousemove
				on:mouseout
			/>
		</div>
	{/each}
</div>
