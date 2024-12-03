<script>
	import { getContext } from 'svelte';
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';

	import StackedAreaChart from '$lib/components/charts/StackedAreaChart.svelte';
	import LineChart from '$lib/components/charts/LineChart.svelte';
	import Switch from '$lib/components/Switch.svelte';
	import EllipsisVertical from '$lib/icons/EllipsisVertical.svelte';
	import XMark from '$lib/icons/XMark.svelte';

	import Tooltip from './Tooltip.svelte';

	export let store;
	/** @type {string[]} */
	export let hiddenRowNames = [];

	/** @type {FuelTechCode[]}*/
	export let seriesLoadsIds = [];

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

	// const { selectedRegionLabel } = getContext('filters');

	let showOptions = false;

	$: names = $seriesNames.filter((/** @type {string} */ d) => !hiddenRowNames.includes(d));
	$: loadIds = names.filter((/** @type {string} */ d) => seriesLoadsIds.includes(d));
	$: colours = names.map((/** @type {string} */ d) => $seriesColours[d]);

	$: updatedSeriesData = $seriesData.map((d) => {
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
	});

	$: updatedYDomain = (() => {
		const addTenPercent = (val) => val + val * 0.1;
		const maxY = updatedSeriesData.map((d) => d._max);
		// @ts-ignore
		const datasetMax = maxY ? addTenPercent(Math.max(...maxY)) : 0;

		const minY = updatedSeriesData.map((d) => d._min);
		// @ts-ignore
		const datasetMin = minY ? addTenPercent(Math.min(...minY)) : 0;

		return [datasetMin, datasetMax];
	})();

	$: updatedHoverData = $hoverTime ? updatedSeriesData.find((d) => d.time === $hoverTime) : null;

	function moveToNextDisplayPrefix() {
		$displayPrefix = getNextPrefix();
	}
</script>

<section class="relative" use:clickoutside on:clickoutside={() => (showOptions = false)}>
	{#if names.length}
		<header class="bg-light-warm-grey rounded-lg px-1 h-[28px] flex align-bottom items-center">
			<div class="md:flex gap-1 items-center">
				<!-- <button
					class="text-mid-warm-grey hover:text-dark-grey"
					on:click={() => (showOptions = !showOptions)}
				>
					<EllipsisVertical class="size-8" />
				</button> -->

				<div class="flex gap-2 items-baseline top-[1px] relative">
					<h6 class="m-0 leading-none">
						{$title}
					</h6>

					{#if $allowPrefixSwitch}
						<button
							class="font-light text-xs text-mid-grey hover:underline"
							on:click={moveToNextDisplayPrefix}
						>
							{$displayUnit || ''}
						</button>
					{:else}
						<span class="font-light text-xs text-mid-grey">{$displayUnit || ''}</span>
					{/if}
				</div>
			</div>
		</header>

		{#if showOptions}
			<div
				in:fly={{ y: -20, duration: 240 }}
				out:fly={{ y: -20, duration: 240 }}
				class="bg-warm-grey/30 h-96 left-3 p-6 rounded-b-lg border-t border-light-warm-grey absolute z-20 backdrop-blur-sm inset-shadow"
			>
				<div>
					<h6>Data</h6>
					<Switch
						buttons={[
							{
								label: 'Absolute',
								value: 'absolute'
							},
							{
								label: 'Proportion',
								value: 'proportion'
							},
							{
								label: 'Change',
								value: 'change'
							},
							{
								label: 'Growth',
								value: 'growth'
							}
						]}
						selected={'absolute'}
					/>
				</div>
				<div>
					<h6>Style</h6>
					<Switch
						buttons={[
							{
								label: 'Smooth',
								value: 'smooth'
							},
							{
								label: 'Straight',
								value: 'straight'
							},
							{
								label: 'Step',
								value: 'step'
							}
						]}
						selected={'straight'}
					/>
				</div>
			</div>
		{/if}

		<Tooltip
			hoverData={updatedHoverData}
			hoverKey={$hoverKey}
			seriesColours={$seriesColours}
			seriesLabels={$seriesLabels}
			convertAndFormatValue={$convertAndFormatValue}
			showTotal={$isChartTypeArea ? true : false}
		/>

		<div class="border-warm-grey border-t">
			{#if $isChartTypeArea}
				<StackedAreaChart
					dataset={updatedSeriesData}
					xKey="time"
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
					snapTicks={true}
					xGridlines={true}
					chartPadding={{ top: 0, right: 0, bottom: 20, left: 0 }}
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
		</div>
	{/if}
</section>
