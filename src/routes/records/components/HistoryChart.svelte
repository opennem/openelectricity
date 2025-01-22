<script>
	import { run } from 'svelte/legacy';

	import { getContext } from 'svelte';
	import { curveStepAfter } from 'd3-shape';
	import { timeYear } from 'd3-time';

	import { startOfYear, addYears } from 'date-fns';
	import { getFormattedMonth } from '$lib/utils/formatters.js';
	import formatDateBasedOnInterval from '$lib/utils/formatters-data-interval';

	import LineChartWithContext from '$lib/components/charts/LineChartWithContext.svelte';
	import DateBrush from '$lib/components/charts/DateBrush.svelte';
	import ResetZoom from '$lib/components/charts/elements/ResetZoom.html.svelte';
	import ChartHeader from '$lib/components/charts/ChartHeader.svelte';

	import { getTickXFormatter } from '../page-data-options/get-x-tick-formatter';
	import Tooltip from './Tooltip.svelte';
	import HistoryTable from './HistoryTable.svelte';

	let { sortedHistoryData } = $props();
	const {
		seriesData,
		xTicks,
		yTicks,
		formatTickX,
		xDomain,
		yDomain,
		convertAndFormatValue,
		hoverData,
		focusData,
		hoverTime,
		focusTime,
		curveType,
		strokeWidth,
		showLineArea,
		allowPrefixSwitch,
		getNextPrefix,
		displayPrefix,
		displayUnit,
		timeZone
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
	$brushXTicks = 5;
	$brushYTicks = 3;
	$brushStrokeWidth = '1px';

	/** @type {*} */
	let brushedRange = $state();
	let customFormatTickX = $derived(getTickXFormatter($xDomain));

	$inspect('customFormatTickX', customFormatTickX);

	$effect(() => {
		if ($seriesData.length) {
			let addTenPercent = (val) => val + val * 0.1;
			let yValue = $seriesData.map((d) => d.value);
			// @ts-ignore
			let datasetMax = yValue ? addTenPercent(Math.max(...yValue)) : 0;
			let datasetMin = yValue < 0 ? addTenPercent(Math.min(...yValue)) : 0;

			$yDomain = [datasetMin, datasetMax];
			$brushYDomain = [datasetMin, datasetMax];
			// $brushXTicks = getYearlyXTicks($seriesData);
		}
	});

	let currentDate = new Date();
	let newPointDate = addYears(currentDate, 1);
	let xData = $derived($hoverTime || $focusTime);
	let yData = $derived($hoverData || $focusData);
	let xValue = $derived(xData ? $formatTickX(xData) : '');
	let yValue = $derived(yData ? $convertAndFormatValue(yData.value) + ' ' + $displayUnit : '');
	let xRange = $derived(
		$seriesData.length > 1 ? [startOfYear($seriesData[0].date), currentDate] : undefined
	);
	let updatedSeriesData = $derived(
		$seriesData.length
			? [
					...$seriesData,
					{
						...$seriesData[$seriesData.length - 1],
						date: newPointDate,
						time: newPointDate.getTime()
					}
				]
			: []
	);
	$effect(() => {
		if (xRange) {
			$xDomain = xRange;
			$brushXDomain = xRange;
		}
	});

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

	function handleZoomReset() {
		$xDomain = xRange;
		brushedRange = undefined;
	}
</script>

<div class="w-full bg-white p-6 rounded-lg border border-warm-grey">
	<DateBrush
		store={dateBrushStore}
		hoverDataX={$hoverData}
		focusDataX={$focusData}
		dataXDomain={brushedRange}
		useDataset={updatedSeriesData}
		textAnchorPosition="start"
		on:brushed={handleBrushed}
	/>

	<div class="grid grid-cols-[5fr_2fr] grid-rows-[570px] gap-6 mt-10">
		<div class="relative">
			<ChartHeader store={historyStore} displayOptions={false} />

			<div class="flex justify-end mb-6">
				<Tooltip {xValue} {yValue} />
			</div>

			{#if brushedRange}
				<div class="absolute top-24 right-3 z-10">
					<ResetZoom on:click={handleZoomReset} />
				</div>
			{/if}

			<LineChartWithContext
				store={historyStore}
				{customFormatTickX}
				showDots={true}
				useDataset={updatedSeriesData}
				on:mousemove
				on:mouseout
				on:pointerup
			/>
		</div>
		<div class="">
			<HistoryTable
				{sortedHistoryData}
				{brushedRange}
				on:mousemove
				on:mouseout
				on:blur
				on:pointerup
			/>
		</div>
	</div>
</div>
