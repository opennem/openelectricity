<script>
	import LineChart from '$lib/components/charts/LineChart.svelte';

	export let store;

	const {
		seriesData,
		seriesNames,
		seriesLabels,
		seriesColours,
		xTicks,
		formatTickX,
		formatTickY,
		chartOverlay,
		chartOverlayLine,
		chartOverlayHatchStroke,
		hoverData
	} = store;

	$: keys = [...$seriesNames].reverse();
</script>

<div class="grid grid-cols-3 border-mid-warm-grey gap-12">
	{#each keys as key}
		<div>
			<h5>{$seriesLabels[key]}</h5>
			<LineChart
				dataset={$seriesData}
				xKey="date"
				yKey={key}
				zKey={$seriesColours[key]}
				xTicks={$xTicks}
				formatTickX={$formatTickX}
				formatTickY={$formatTickY}
				overlay={$chartOverlay}
				overlayLine={$chartOverlayLine}
				overlayStroke={$chartOverlayHatchStroke}
				hoverData={$hoverData}
				chartHeightClasses="h-[150px]"
				on:mousemove
				on:mouseout
			/>
		</div>
	{/each}
</div>
