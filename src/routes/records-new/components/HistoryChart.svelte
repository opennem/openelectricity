<script>
	import { getContext } from 'svelte';
	import { curveStepAfter } from 'd3-shape';

	import LineChart from '$lib/components/charts/LineChart.svelte';

	import LineChartWithContext from '$lib/components/charts/LineChartWithContext.svelte';
	import DateBrush from '$lib/components/charts/DateBrush.svelte';
	import Tooltip from './Tooltip.svelte';

	const {
		seriesData,
		xTicks,
		yTicks,
		formatTickX,
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
		console.log('evt', evt.detail);
		const brushedDates = [new Date(evt.detail.start), new Date(evt.detail.end)];
		const brushedTimes = [evt.detail.start, evt.detail.end];
		console.log('brushedDates', brushedDates);
	}
</script>

<Tooltip {xValue} {yValue} />

<LineChartWithContext store={historyStore} on:mousemove on:mouseout on:pointerup />
<DateBrush store={dateBrushStore} on:brushed={handleBrushed} />
