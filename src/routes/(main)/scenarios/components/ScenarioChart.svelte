<script>
	import { getContext } from 'svelte';
	import StackedAreaChart from '$lib/components/charts/StackedAreaChart.svelte';
	import LineChart from '$lib/components/charts/LineChart.svelte';

	import Tooltip from './Tooltip.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {any} store
	 * @property {string[]} [hiddenRowNames]
	 * @property {FuelTechCode[]} [seriesLoadsIds]
	 */

	/** @type {Props} */
	let { store, hiddenRowNames = [], seriesLoadsIds = [] } = $props();

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
		hoverTime,
		hoverData,
		focusData,
		getNextPrefix
	} = store;

	const {
		singleSelectionModelScenarioLabel,
		singleSelectionPathway,
		selectedRegionLabel,
		isScenarioViewSection,
		isRegionViewSection
	} = getContext('scenario-filters');

	let names = $derived(
		$seriesNames.filter((/** @type {string} */ d) => !hiddenRowNames.includes(d))
	);
	let loadIds = $derived(names.filter((/** @type {string} */ d) => seriesLoadsIds.includes(d)));
	let colours = $derived(names.map((/** @type {string} */ d) => $seriesColours[d]));

	let updatedSeriesData = $derived(
		$seriesData.map((d) => {
			/** @type {TimeSeriesData} */
			const newObj = { ...d };
			// get min and max values for each time series
			newObj._max = 0;
			newObj._min = 0;
			names.forEach((l) => {
				const value = d[l] || 0;
				if ($isChartTypeArea) {
					if (newObj._max || newObj._max === 0) newObj._max += +value;
				} else {
					if (newObj._max || newObj._max === 0) newObj._max = Math.max(newObj._max, +value);
				}
			});
			loadIds.forEach((l) => {
				const value = d[l] || 0;
				if ($isChartTypeArea) {
					if (newObj._min || newObj._min === 0) newObj._min += +value;
				} else {
					if (newObj._min || newObj._min === 0) newObj._min = Math.min(newObj._min, +value);
				}
			});

			return newObj;
		})
	);

	let updatedYDomain = $derived(
		(() => {
			const addTenPercent = (val) => val + val * 0.1;
			const maxY = updatedSeriesData.map((d) => d._max);
			// @ts-ignore
			const datasetMax = maxY ? addTenPercent(Math.max(...maxY)) : 0;

			const minY = updatedSeriesData.map((d) => d._min);
			// @ts-ignore
			const datasetMin = minY ? addTenPercent(Math.min(...minY)) : 0;

			return [datasetMin, datasetMax];
		})()
	);

	let updatedHoverData = $derived(
		$hoverTime ? updatedSeriesData.find((d) => d.time === $hoverTime) : null
	);

	function moveToNextDisplayPrefix() {
		$displayPrefix = getNextPrefix();
	}
</script>

<section>
	{#if names.length}
		<header>
			<div class="md:flex gap-2 items-center px-10 md:px-0">
				<div class="flex gap-2 items-center">
					<h5 class="m-0 leading-none">
						{$title}
					</h5>

					{#if $allowPrefixSwitch}
						<button
							class="font-light text-sm text-mid-grey hover:underline"
							onclick={moveToNextDisplayPrefix}
						>
							{$displayUnit || ''}
						</button>
					{:else}
						<span class="font-light text-sm text-mid-grey">{$displayUnit || ''}</span>
					{/if}

					<span class="hidden md:block font-light text-sm text-mid-grey">—</span>
				</div>

				{#if $isScenarioViewSection}
					<span class="font-light text-xs md:text-sm text-mid-grey relative -top-1 md:top-0">
						{$selectedRegionLabel}
					</span>
				{:else}
					<span class="font-light text-xs md:text-sm text-mid-grey relative -top-1 md:top-0">
						{$singleSelectionModelScenarioLabel} ({$singleSelectionPathway}), {$selectedRegionLabel}
					</span>
				{/if}
			</div>

			<Tooltip
				hoverData={updatedHoverData}
				hoverKey={$hoverKey}
				seriesColours={$seriesColours}
				seriesLabels={$seriesLabels}
				convertAndFormatValue={$convertAndFormatValue}
				showTotal={$isChartTypeArea ? true : false}
			/>
		</header>

		{#if $isChartTypeArea || $isScenarioViewSection || $isRegionViewSection}
			<StackedAreaChart
				dataset={updatedSeriesData}
				xKey="date"
				yKey={[0, 1]}
				zKey="key"
				xTicks={$xTicks}
				yTicks={2}
				yDomain={updatedYDomain}
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
		{:else}
			<LineChart
				dataset={$seriesData}
				xKey="date"
				yKey={$seriesNames[0]}
				zKey={colours[0]}
				xTicks={$xTicks}
				yTicks={2}
				formatTickX={$formatTickX}
				formatTickY={$convertAndFormatValue}
				overlay={$chartOverlay}
				overlayLine={$chartOverlayLine}
				overlayStroke={$chartOverlayHatchStroke}
				hoverData={$hoverData}
				focusData={$focusData}
				showArea={false}
				chartHeightClasses={$chartHeightClasses}
				on:mousemove
				on:mouseout
				on:pointerup
			/>
		{/if}
	{/if}
</section>
