<script>
	import { LayerCake, Svg, Html, flatten, stack, groupLonger } from 'layercake';
	import { tweened } from 'svelte/motion';
	import * as eases from 'svelte/easing';
	import { scaleOrdinal } from 'd3-scale';
	import getSeqId from '$lib/utils/html-id-gen';
	import AreaStacked from './elements/AreaStacked.svelte';
	import AxisX from './elements/AxisX.svelte';
	import AxisY from './elements/AxisY.svelte';
	import HoverLayer from './elements/HoverLayer.svelte';
	import HoverLine from './elements/HoverLine.html.svelte';
	import ClipPath from './elements/defs/ClipPath.svelte';
	import HoverText from './elements/HoverText.html.svelte';
	import Overlay from './elements/Overlay.svelte';
	import HatchPattern from './elements/defs/HatchPattern.svelte';
	import LineX from './elements/annotations/LineX.svelte';

	/** @type {TimeSeriesData[]} */
	export let dataset = [];

	export let title = '';

	export let clip = true;

	export let xKey = 'date';

	/** @type {number[]} */
	export let yKey = [];

	/** @type {Array.<number | null> | undefined} */
	export let yDomain = undefined;

	export let zKey = '';

	/** @type {string[]} */
	export let seriesNames = [];

	/** @type {string[]} legend colour */
	export let zRange = [];

	/** @type {*} */
	export let xTicks = undefined;

	/** @type {*} */
	export let yTicks = undefined;

	/** If true, overlay will take up the full width of the chart
	 * If object with xStartValue and xEndValue, overlay will be a range
	 * @type {*} */
	export let overlay = null;

	export let overlayStroke = 'rgba(236, 233, 230, 0.4)';

	/** @type {*} */
	export let blankOverlay = false;

	/** @type {*} */
	export let overlayLine = false;

	export let chartType = 'area'; // line, area

	/** @type {TimeSeriesData | undefined}*/
	export let hoverData = undefined;

	/** @type {Function} A function that passes the current tick value and expects a nicely formatted value in return. */
	export let formatTickX = (/** @type {*} */ d) => d;
	export let formatTickY = (/** @type {number} */ d) => d;

	export let chartHeightClasses = '';

	/** @type {string | null} */
	export let highlightId = null;

	const id = getSeqId();
	const defaultChartHeightClasses = 'h-[150px] md:h-[200px]';

	/** TODO: work out transition */
	const tweenOptions = {
		duration: 750,
		easing: eases.cubicInOut
	};
	const yTweened = tweened(/** @type {number|null} */ (null), tweenOptions);

	// $: maxY = yDomain ? yDomain[1] : null;
	// $: maxArr = [...dataset.map((d) => d._max)];
	// @ts-ignore
	// $: datasetMax = maxArr ? Math.max(...maxArr) : 0;
	// $: if (dataset) yTweened.set(maxY);
	/** end */

	$: stackedData = stack(dataset, seriesNames);
	$: groupedData = dataset ? groupLonger(dataset, seriesNames) : [];
	$: chartData = chartType === 'area' ? stackedData : groupedData;
	$: flatData = chartType === 'area' ? flatten(stackedData) : flatten(groupedData, 'values');
	$: y = chartType === 'area' ? yKey : 'value';
	$: z = chartType === 'area' ? zKey : 'group';

	$: heightClasses = chartHeightClasses || defaultChartHeightClasses;

	// $: console.log('groupedData', groupedData);

	$: hoverTime = hoverData ? hoverData.time || 0 : 0;
</script>

<div class="chart-container mb-4 {heightClasses}">
	<LayerCake
		padding={{ top: 0, right: 0, bottom: 40, left: 0 }}
		x={(/** @type {*} */ d) => {
			// return display === 'area' ? d[xKey] || d.data[xKey] : 'date';
			return d[xKey] || d.data[xKey];
		}}
		{y}
		{z}
		{yDomain}
		zScale={scaleOrdinal()}
		zDomain={seriesNames}
		{zRange}
		{flatData}
		data={chartData}
	>
		<Svg>
			<defs>
				<ClipPath id={`${id}-clip-path`} />
			</defs>

			{#if overlay}
				<Overlay fill="#FAF9F6" {...overlay} />
			{/if}

			<HoverLayer {dataset} on:mousemove on:mouseout />

			<!-- {#if display === 'area'}
				<AreaStacked
					clipPathId={clip ? `${id}-clip-path` : ''}
					{dataset}
					on:mousemove
					on:mouseout
				/>
			{:else}
				<MultiLine />
			{/if} -->

			<AreaStacked
				clipPathId={clip ? `${id}-clip-path` : ''}
				{dataset}
				display={chartType}
				{highlightId}
				on:mousemove
				on:mouseout
			/>
		</Svg>

		<Svg pointerEvents={false}>
			<defs>
				<HatchPattern id={`${id}-hatch-pattern`} stroke={overlayStroke} />
			</defs>

			{#if overlay}
				<Overlay fill="url(#{`${id}-hatch-pattern`})" {...overlay} />
			{/if}

			{#if blankOverlay}
				<Overlay fill="#ffffff" {...blankOverlay} />
			{/if}

			{#if overlayLine}
				<LineX xValue={overlayLine} />
			{/if}

			<AxisY
				ticks={yTicks}
				xTick={5}
				formatTick={formatTickY}
				gridlines={true}
				stroke="#33333344"
			/>
			<AxisX
				ticks={xTicks}
				gridlines={false}
				formatTick={hoverData ? () => '' : formatTickX}
				tickMarks={hoverData ? false : true}
				snapTicks={true}
			/>
		</Svg>

		<Html pointerEvents={false}>
			<HoverText {hoverData} isShapeStack={true} position="bottom">
				<span class="text-[10px] block">
					{formatTickX(hoverTime)}
				</span>
			</HoverText>
			<!-- <HoverLine {hoverData} isShapeStack={true} useDataHeight={true} /> -->

			<HoverLine {hoverData} />
		</Html>

		<Svg pointerEvents={false}>
			<!-- <HoverDots {dataset} {hoverData} /> -->
		</Svg>
	</LayerCake>

	<p class="text-xs text-mid-grey relative -top-5 md:hidden">{title}</p>
</div>

<style>
	.chart-container {
		width: 100%;
	}
</style>
