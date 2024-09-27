<script>
	import { getContext } from 'svelte';
	import { curveStepAfter } from 'd3-shape';
	import { format } from 'date-fns';

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
		showLineArea
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

	$: if ($seriesData.length) {
		const addTenPercent = (val) => val + val * 0.1;
		const maxY = $seriesData.map((d) => d.value);
		// @ts-ignore
		const datasetMax = maxY ? addTenPercent(Math.max(...maxY)) : 0;

		$yDomain = [0, datasetMax];
		$brushYDomain = [0, datasetMax];
	}

	$: xValue = $hoverTime ? $formatTickX($hoverTime) : '';
	$: yValue = $hoverData
		? $convertAndFormatValue($hoverData.value) + ' ' + $hoverData.value_unit
		: '';

	/**
	 * @param {CustomEvent} evt
	 */
	function handleBrushed(evt) {
		$xDomain = [evt.detail.start, evt.detail.end];
	}

	function handleReset() {
		$xDomain = undefined;
		$brushXDomain = undefined;
	}
</script>

<Tooltip {xValue} {yValue} />

<LineChartWithContext
	store={historyStore}
	customFormatTickX={(d) => format(d, 'd MMM')}
	on:mousemove
	on:mouseout
	on:pointerup
/>

<div class="pt-4">
	<DateBrush store={dateBrushStore} dataXDomain={$xDomain} on:brushed={handleBrushed} />
</div>

<div class="h-4 grid grid-cols-7 mt-6">
	{#if $xDomain}
		<button
			on:click={handleReset}
			class="col-start-4 text-sm flex items-center gap-3 justify-center px-4 py-2 border rounded-xl whitespace-nowrap bg-white text-dark-grey hover:text-white hover:bg-dark-grey"
		>
			reset
		</button>
	{/if}
</div>
