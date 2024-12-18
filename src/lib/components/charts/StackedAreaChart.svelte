<script>
	import { LayerCake, Svg, Html, flatten, stack, groupLonger } from 'layercake';
	import { tweened } from 'svelte/motion';
	import * as eases from 'svelte/easing';
	import { scaleOrdinal, scaleUtc } from 'd3-scale';
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
	import Dot from './elements/annotations/Dot.svelte';
	// import HoverDots from './elements/HoverDots.svelte';

	/** @type {TimeSeriesData[]} */
	export let dataset = [];

	export let title = '';

	export let clip = true;

	export let xKey = 'date';

	/** @type {number[] | number} */
	export let yKey = [];

	/** @type {Array.<number | null> | undefined} */
	export let yDomain = undefined;

	/** @type {*} */
	export let xDomain = undefined;

	export let zKey = '';

	/** @type {string[]} */
	export let seriesNames = [];

	/** @type {string[]} legend colour */
	export let zRange = [];

	/** @type {*} */
	export let xTicks = undefined;

	/** @type {*} */
	export let yTicks = undefined;

	/** @type {Boolean} */
	export let snapTicks = true;

	export let xGridlines = false;

	export let chartPadding = { top: 0, right: 0, bottom: 40, left: 0 };

	/** If true, overlay will take up the full width of the chart
	 * If object with xStartValue and xEndValue, overlay will be a range
	 * @type {*} */
	export let overlay = null;

	export let overlayStroke = 'rgba(236, 233, 230, 0.4)';

	/** @type {*} */
	export let blankOverlay = false;

	/** @type {{ date: Date } | undefined} */
	export let overlayLine = undefined;

	export let chartType = 'area'; // line, area

	/** @type {TimeSeriesData | undefined}*/
	export let hoverData = undefined;

	/** @type {TimeSeriesData | undefined}*/
	export let focusData = undefined;

	/** @type {Function} A function that passes the current tick value and expects a nicely formatted value in return. */
	export let formatTickX = (/** @type {*} */ d) => d;
	export let formatTickY = (/** @type {number} */ d) => d;

	export let chartHeightClasses = '';

	export let curveFunction = null;

	/** @type {string | undefined} */
	export let highlightId = '';

	const id = getSeqId();
	const defaultChartHeightClasses = 'h-[150px] md:h-[200px]';

	/** TODO: work out transition */
	const tweenOptions = {
		duration: 750,
		easing: eases.cubicInOut
	};
	const yTweened = tweened(/** @type {number|null} */ (null), tweenOptions);

	$: isLine = chartType === 'line';
	$: isArea = chartType === 'area';
	$: stackedData = stack(dataset, seriesNames);
	$: groupedData = dataset ? groupLonger(dataset, seriesNames) : [];
	$: chartData = isArea ? stackedData : groupedData;
	$: flatData = isArea ? flatten(stackedData) : flatten(groupedData, 'values');
	$: y = isArea ? yKey : 'value';
	$: z = isArea ? zKey : 'group';
	$: clipPathId = clip ? `${id}-clip-path` : '';

	$: heightClasses = chartHeightClasses || defaultChartHeightClasses;
</script>

<div class="chart-container mb-4 {heightClasses}">
	<LayerCake
		padding={chartPadding}
		x={(/** @type {*} */ d) => {
			// return display === 'area' ? d[xKey] || d.data[xKey] : 'date';
			return d[xKey] || d.data[xKey];
		}}
		{y}
		{z}
		{yDomain}
		{xDomain}
		xScale={scaleUtc()}
		zScale={scaleOrdinal()}
		zDomain={seriesNames}
		{zRange}
		{flatData}
		data={chartData}
	>
		<Svg>
			<defs>
				<ClipPath id={clipPathId} />
			</defs>

			{#if overlay}
				<Overlay fill="#FAF9F6" {...overlay} />
			{/if}

			<HoverLayer {dataset} on:mousemove on:mouseout on:pointerup />

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

			<g clip-path={clipPathId ? `url(#${clipPathId})` : ''}>
				<AreaStacked
					{dataset}
					display={chartType}
					{highlightId}
					curveType={$curveFunction}
					on:mousemove
					on:mouseout
					on:pointerup
				/>
			</g>
		</Svg>

		<Svg pointerEvents={false}>
			<defs>
				<HatchPattern id={`${id}-hatch-pattern`} stroke={overlayStroke} />

				<ClipPath id={clipPathId} />
			</defs>

			<g clip-path={clipPathId ? `url(#${clipPathId})` : ''}>
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
					gridlines={xGridlines}
					formatTick={formatTickX}
					tickMarks={true}
					{snapTicks}
					stroke="#33333344"
				/>

				{#if hoverData}
					<LineX xValue={hoverData} strokeArray="none" />
				{/if}
				{#if focusData}
					<LineX xValue={focusData} strokeArray="none" strokeColour="#C74523" />
				{/if}
				{#if isLine}
					<Dot domains={seriesNames} value={hoverData} />
				{/if}
			</g>
		</Svg>
	</LayerCake>

	<p class="text-xs text-mid-grey relative -top-5 md:hidden">{title}</p>
</div>

<style>
	.chart-container {
		width: 100%;
	}
</style>
