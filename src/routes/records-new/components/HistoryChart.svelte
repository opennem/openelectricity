<script>
	import { getContext } from 'svelte';
	import { curveStepAfter } from 'd3-shape';

	import LineChart from '$lib/components/charts/LineChart.svelte';
	import Tooltip from './Tooltip.svelte';

	const {
		title,
		seriesNames,
		seriesData,
		formatTickX,
		convertAndFormatValue,
		hoverData,
		focusData,
		hoverTime,
		chartHeightClasses
	} = getContext('record-history-data-viz');

	$: updatedYDomain = (() => {
		const addTenPercent = (val) => val + val * 0.1;
		const maxY = $seriesData.map((d) => d.value);
		// @ts-ignore
		const datasetMax = maxY ? addTenPercent(Math.max(...maxY)) : 0;
		return [0, datasetMax];
	})();

	$: console.log('updatedYDomain', updatedYDomain);

	$: xValue = $hoverTime ? $formatTickX($hoverTime) : '';
	$: yValue = $hoverData
		? $convertAndFormatValue($hoverData.value) + ' ' + $hoverData.value_unit
		: '';
</script>

<Tooltip {xValue} {yValue} />

<LineChart
	dataset={$seriesData}
	xKey="date"
	yKey={$seriesNames[0]}
	xTicks={4}
	yTicks={3}
	snapXTicks={false}
	yDomain={updatedYDomain}
	formatTickX={$formatTickX}
	formatTickY={$convertAndFormatValue}
	curveType={curveStepAfter}
	strokeWidth="1px"
	showArea={false}
	hoverData={$hoverData}
	focusData={$focusData}
	chartHeightClasses={$chartHeightClasses}
	on:mousemove
	on:mouseout
	on:pointerup
/>
