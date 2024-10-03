<script>
	import { getContext } from 'svelte';
	import { curveStepAfter } from 'd3-shape';
	import { format, startOfYear, addYears, eachYearOfInterval } from 'date-fns';

	import LineChartWithContext from '$lib/components/charts/LineChartWithContext.svelte';
	import DateBrush from '$lib/components/charts/DateBrush.svelte';

	import Tooltip from './Tooltip.svelte';

	const {
		seriesData,
		xTicks,
		yTicks,
		formatTickX,
		xDomain,
		yDomain,
		convertAndFormatValue,
		hoverData,
		hoverTime,
		curveType,
		strokeWidth,
		showLineArea,
		allowPrefixSwitch,
		getNextPrefix,
		displayPrefix,
		displayUnit
	} = getContext('record-history-data-viz');
	const historyStore = getContext('record-history-data-viz');

	const {
		curveType: brushCurveType,
		xTicks: brushXTicks,
		yTicks: brushYTicks,
		strokeWidth: brushStrokeWidth,
		xDomain: brushXDomain,
		yDomain: brushYDomain
	} = getContext('date-brush-data-viz');
	const dateBrushStore = getContext('date-brush-data-viz');

	$curveType = curveStepAfter;
	$xTicks = 4;
	$yTicks = 3;
	$strokeWidth = '1px';
	$showLineArea = false;

	$brushCurveType = curveStepAfter;
	$brushXTicks = 4;
	$brushYTicks = 3;
	$brushStrokeWidth = '1px';

	/** @type {*} */
	let brushedRange;

	$: if ($seriesData.length) {
		const addTenPercent = (val) => val + val * 0.1;
		const maxY = $seriesData.map((d) => d.value);
		// @ts-ignore
		const datasetMax = maxY ? addTenPercent(Math.max(...maxY)) : 0;

		$yDomain = [0, datasetMax];
		$brushYDomain = [0, datasetMax];
	}

	$: xValue = $hoverTime ? $formatTickX($hoverTime) : '';
	$: yValue = $hoverData ? $convertAndFormatValue($hoverData.value) + ' ' + $displayUnit : '';
	$: xRange =
		$seriesData.length > 1
			? [
					startOfYear($seriesData[0].date),
					startOfYear(addYears($seriesData[$seriesData.length - 1].date, 1))
			  ]
			: undefined;
	$: if (xRange) {
		$xDomain = xRange;
		$brushXDomain = xRange;
	}
	$: axisXTicks = xRange
		? eachYearOfInterval({
				start: xRange[0],
				end: xRange[1]
		  })
		: undefined;

	/**
	 * @param {CustomEvent} evt
	 */
	function handleBrushed(evt) {
		if (evt.detail.start === evt.detail.end) {
			$xDomain = xRange;
			brushedRange = undefined;
			return;
		}
		$xDomain = [evt.detail.start, evt.detail.end];
		brushedRange = [evt.detail.start, evt.detail.end];
	}

	// function handleReset() {
	// 	$xDomain = undefined;
	// 	$brushXDomain = undefined;
	// }

	function moveToNextDisplayPrefix() {
		$displayPrefix = getNextPrefix();
	}
</script>

<div class="flex justify-between item p-6 ml-2">
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

	<Tooltip {xValue} {yValue} />
</div>
<div class="wrapper gap-6 p-6 pt-0 pb-10 h-full">
	<LineChartWithContext
		store={historyStore}
		customFormatTickX={(d) => format(d, 'd MMM')}
		heightClasses="h-auto"
		showDots={true}
		on:mousemove
		on:mouseout
		on:pointerup
	/>

	<DateBrush
		store={dateBrushStore}
		{axisXTicks}
		dataXDomain={brushedRange}
		on:brushed={handleBrushed}
	/>
</div>

<style>
	.wrapper {
		display: grid;
		grid-template-rows: 5fr 120px;
	}
</style>
