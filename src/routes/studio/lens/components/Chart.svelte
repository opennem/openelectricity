<script>
	import { getContext } from 'svelte';
	import { fly } from 'svelte/transition';
	import { clickoutside } from '@svelte-put/clickoutside';

	import StackedAreaChart from '$lib/components/charts/StackedAreaChart.svelte';
	import ChartOptions from './ChartOptions.svelte';
	import EllipsisVertical from '$lib/icons/EllipsisVertical.svelte';

	import Tooltip from './Tooltip.svelte';

	export let store;

	const {
		title,
		allowPrefixSwitch,
		displayPrefix,
		displayUnit,
		convertAndFormatValue,
		seriesScaledData,
		isDataScaleTypeProportion,
		visibleSeriesNames,
		visibleSeriesColours,
		seriesLabels,
		xTicks,
		formatTickX,
		chartType,
		isChartTypeArea,
		isChartTypeLine,
		chartOverlay,
		chartOverlayLine,
		chartOverlayHatchStroke,
		chartHeightClasses,
		hoverKey,
		hoverTime,
		hoverData,
		focusData,
		getNextPrefix,
		curveFunction
	} = store;

	const { selectedRange } = getContext('filters');

	let showOptions = false;

	$: updatedSeriesData = $seriesScaledData.map((d) => {
		/** @type {TimeSeriesData} */
		const newObj = { ...d };
		// get min and max values for each time series
		newObj._max = 0;
		newObj._min = 0;
		$visibleSeriesNames.forEach((l) => {
			const value = d[l] || 0;
			if ($isChartTypeArea) {
				if (newObj._max || newObj._max === 0) newObj._max += +value;
			} else {
				if (newObj._max || newObj._max === 0) newObj._max = Math.max(newObj._max, +value);
			}

			if ($isChartTypeArea) {
				if ((newObj._min || newObj._min === 0) && value < 0) newObj._min += +value;
			} else {
				if (newObj._min || newObj._min === 0) newObj._min = Math.min(newObj._min, +value);
			}
		});

		return newObj;
	});

	$: updatedYDomain = (() => {
		if ($isDataScaleTypeProportion && !$isChartTypeLine) return [0, 100];

		const addTenPercent = (val) => val + val * 0.1;
		const maxY = updatedSeriesData.map((d) => d._max);
		// @ts-ignore
		const datasetMax = maxY ? addTenPercent(Math.max(...maxY)) : 0;

		const minY = updatedSeriesData.map((d) => d._min);

		// @ts-ignore
		const datasetMin = minY ? addTenPercent(Math.min(...minY)) : 0;

		return [Math.floor(datasetMin), Math.ceil(datasetMax)];
	})();

	$: updatedHoverData = $hoverTime ? updatedSeriesData.find((d) => d.time === $hoverTime) : null;

	function moveToNextDisplayPrefix() {
		$displayPrefix = getNextPrefix();
	}
</script>

<section class="relative">
	{#if $visibleSeriesNames.length}
		<div use:clickoutside on:clickoutside={() => (showOptions = false)} class="sticky top-0 z-20">
			<header
				class="bg-light-warm-grey rounded-t-lg px-1 h-[28px] flex align-bottom items-center relative z-20 border-b border-warm-grey"
				class:rounded-bl-none={showOptions}
			>
				<div class="flex gap-1 items-center">
					<button
						class="text-mid-warm-grey hover:text-dark-grey"
						on:click={() => (showOptions = !showOptions)}
					>
						<EllipsisVertical class="size-8" />
					</button>

					<div class="flex gap-2 items-baseline top-[1px] relative">
						<h6 class="m-0 leading-none">
							{$title}
						</h6>

						{#if $isDataScaleTypeProportion}
							<span class="font-light text-xs text-mid-grey">%</span>
						{:else if $allowPrefixSwitch}
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
					class="bg-white/60 shadow-inner p-6 rounded-b-lg absolute z-10 backdrop-blur-lg inset-shadow flex gap-6 flex-col"
				>
					<ChartOptions {store} />
				</div>
			{/if}
		</div>

		<div class="sticky top-11 z-20">
			<Tooltip
				hoverData={updatedHoverData}
				hoverKey={$hoverKey}
				seriesColours={$visibleSeriesColours}
				seriesLabels={$seriesLabels}
				convertAndFormatValue={$convertAndFormatValue}
				showTotal={$isChartTypeArea && !$isDataScaleTypeProportion ? true : false}
				yearOnly={$selectedRange === 'yearly'}
			/>
		</div>

		<div class="border-warm-grey border-t">
			<StackedAreaChart
				dataset={updatedSeriesData}
				xKey="time"
				yKey={[0, 1]}
				zKey="key"
				xTicks={$xTicks}
				yTicks={2}
				yDomain={updatedYDomain}
				seriesNames={$visibleSeriesNames}
				zRange={$visibleSeriesColours}
				formatTickX={$formatTickX}
				formatTickY={$isDataScaleTypeProportion ? (d) => d : $convertAndFormatValue}
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
				{curveFunction}
				on:mousemove
				on:mouseout
				on:pointerup
			/>
		</div>
	{/if}
</section>
