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
		isChartTypeArea,
		chartOverlay,
		chartOverlayLine,
		chartOverlayHatchStroke,
		chartHeightClasses,
		hoverKey,
		hoverData,
		focusData
	} = store;

	// unit
	// model
	// scenario
	// pathway
	// region

	$: names = $seriesNames.filter((/** @type {string} */ d) => !hiddenRowNames.includes(d));
	$: colours = names.map((/** @type {string} */ d) => $seriesColours[d]);
</script>

<section>
	{#if names.length}
		<header>
			<div>
				<h5 class="m-0">
					{$title}

					<span class="text-sm font-light text-mid-grey">GWh</span>

					<span class="text-sm font-light text-mid-grey">— AEMO Step Change 2024 (CDP12), NEM</span>
				</h5>
			</div>

			<Tooltip
				hoverData={$hoverData || $focusData}
				hoverKey={$hoverKey}
				seriesColours={$seriesColours}
				seriesLabels={$seriesLabels}
				showTotal={$isChartTypeArea ? true : false}
			/>
		</header>

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
			focusData={$focusData}
			chartHeightClasses={$chartHeightClasses}
			on:mousemove
			on:mouseout
			on:pointerup
		/>
	{/if}
</section>
