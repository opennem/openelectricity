<script>
	import { getContext } from 'svelte';
	import StackedAreaChart from '$lib/components/charts/StackedAreaChart.svelte';
	import Tooltip from './Tooltip.svelte';

	export let store;
	/** @type {string[]} */
	export let hiddenRowNames = [];

	const {
		title,
		allowPrefixSwitch,
		displayPrefix,
		displayUnit,
		convertAndFormatValue,
		seriesData,
		seriesNames,
		seriesColours,
		seriesLabels,
		yDomain,
		xTicks,
		formatTickX,
		chartType,
		isChartTypeArea,
		chartOverlay,
		chartOverlayLine,
		chartOverlayHatchStroke,
		chartHeightClasses,
		hoverKey,
		hoverData,
		focusData,
		getNextPrefix
	} = store;

	const { singleSelectionModelScenarioLabel, singleSelectionPathway, selectedRegionLabel } =
		getContext('scenario-filters');

	$: names = $seriesNames.filter((/** @type {string} */ d) => !hiddenRowNames.includes(d));
	$: colours = names.map((/** @type {string} */ d) => $seriesColours[d]);

	function moveToNextDisplayPrefix() {
		$displayPrefix = getNextPrefix();
	}
</script>

<section>
	{#if names.length}
		<header>
			<div class="flex gap-2 items-center">
				<h5 class="m-0 leading-none">
					{$title}
				</h5>

				{#if $allowPrefixSwitch}
					<button
						class="font-light text-sm text-mid-grey hover:underline"
						on:click={moveToNextDisplayPrefix}
					>
						{$displayUnit || ''}
					</button>
				{:else}
					<span class="font-light text-sm text-mid-grey">{$displayUnit || ''}</span>
				{/if}

				<span class="font-light text-sm text-mid-grey">—</span>

				<span class="font-light text-sm text-mid-grey">
					{$singleSelectionModelScenarioLabel} ({$singleSelectionPathway}), {$selectedRegionLabel}
				</span>
			</div>

			<Tooltip
				hoverData={$hoverData || $focusData}
				hoverKey={$hoverKey}
				seriesColours={$seriesColours}
				seriesLabels={$seriesLabels}
				convertAndFormatValue={$convertAndFormatValue}
				showTotal={$isChartTypeArea ? true : false}
			/>
		</header>

		<StackedAreaChart
			dataset={$seriesData}
			xKey="date"
			yKey={[0, 1]}
			zKey="key"
			xTicks={$xTicks}
			yTicks={2}
			yDomain={$yDomain}
			seriesNames={names}
			zRange={colours}
			formatTickX={$formatTickX}
			formatTickY={$convertAndFormatValue}
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
