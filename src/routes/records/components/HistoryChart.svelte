<script>
	import { getContext } from 'svelte';
	import { curveStepAfter } from 'd3-shape';
	import { timeYear } from 'd3-time';

	import { startOfYear, addYears } from 'date-fns';
	import { getFormattedMonth } from '$lib/utils/formatters.js';

	import LineChartWithContext from '$lib/components/charts/LineChartWithContext.svelte';
	import DateBrush from '$lib/components/charts/DateBrush.svelte';
	import ResetZoom from '$lib/components/charts/elements/ResetZoom.html.svelte';
	import getXTicks from '../page-data-options/get-x-ticks';
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
	$xTicks = 5;
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

	$: axisXTicks = xRange ? timeYear.every(2)?.range(xRange[0], xRange[1]) : undefined;
	$: $xTicks = axisXTicks && !brushedRange ? axisXTicks : 5;

	// insert the first and last item in xRange into axisXTicks
	$: if (axisXTicks && xRange) {
		const xStartYear = getFormattedMonth(xRange[0], undefined);
		const tickStartYear = getFormattedMonth(axisXTicks[0], undefined);
		const xEndYear = getFormattedMonth(xRange[1], undefined);
		const tickEndYear = getFormattedMonth(axisXTicks[axisXTicks.length - 1], undefined);

		// if not the same year, insert the first item in xRange into axisXTicks
		if (xStartYear !== tickStartYear) {
			axisXTicks.unshift(xRange[0]);
		}
		// if not the same year, insert the last item in xRange into axisXTicks
		if (xEndYear !== tickEndYear) {
			axisXTicks.push(xRange[1]);
		}
	}

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

	function handleZoomReset() {
		$xDomain = xRange;
		brushedRange = undefined;
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
<div class="wrapper md:grid flex flex-col gap-6 p-6 pt-0 pb-10 h-full relative">
	{#if brushedRange}
		<div class="absolute top-2 right-6 z-10">
			<ResetZoom on:click={handleZoomReset} />
		</div>
	{/if}

	<LineChartWithContext
		store={historyStore}
		customFormatTickX={(d) => getXTicks(d, brushedRange || xRange)}
		heightClasses="h-[300px] md:h-auto"
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
		grid-template-rows: 5fr 120px;
	}
</style>
