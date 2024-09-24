<script>
	import { LayerCake, Svg, Html } from 'layercake';

	import getSeqId from '$lib/utils/html-id-gen';
	import Line from './elements/Line.svelte';
	import Area from './elements/Area.svelte';
	import AxisX from './elements/AxisX.svelte';
	import AxisY from './elements/AxisY.svelte';
	import HoverLayer from './elements/HoverLayer.svelte';
	import ClipPath from './elements/defs/ClipPath.svelte';
	import HoverText from './elements/HoverText.html.svelte';
	import Overlay from './elements/Overlay.svelte';
	import HatchPattern from './elements/defs/HatchPattern.svelte';
	import LineX from './elements/annotations/LineX.svelte';
	import Dot from './elements/annotations/Dot.svelte';

	/** @type {TimeSeriesData[]} */
	export let dataset = [];

	export let title = '';

	export let clip = true;

	export let xKey = 'date';

	export let yKey = '';

	/** @type {Array.<number | null> | undefined} */
	export let yDomain = undefined;

	export let zKey = '';

	/** @type {*} */
	export let xTicks = undefined;

	export let snapXTicks = true;

	/** @type {*} */
	export let yTicks = undefined;

	/** If true, overlay will take up the full width of the chart
	 * If object with xStartValue and xEndValue, overlay will be a range
	 * @type {*} */
	export let overlay = null;

	export let overlayStroke = 'rgba(236, 233, 230, 0.4)';

	/** @type {*} */
	export let overlayLine = false;

	export let curveType = undefined;

	export let strokeWidth = '2px';

	/** @type {TimeSeriesData | undefined}*/
	export let hoverData = undefined;

	/** @type {TimeSeriesData | undefined}*/
	export let focusData = undefined;

	/** @type {Function} A function that passes the current tick value and expects a nicely formatted value in return. */
	export let formatTickX = (/** @type {*} */ d) => d;
	export let formatTickY = (/** @type {number} */ d) => d;

	export let chartHeightClasses = '';

	/** @type {string | null} */
	export let highlightId = null;

	export let showArea = true;

	const id = getSeqId();
	const defaultChartHeightClasses = 'h-[150px] md:h-[200px]';

	$: heightClasses = chartHeightClasses || defaultChartHeightClasses;

	// $: console.log('groupedData', groupedData);

	$: hoverTime = hoverData ? hoverData.time || 0 : 0;
	$: clipPathId = clip ? `${id}-clip-path` : '';
	$: maxValue = Math.round(Math.max(...dataset.map((d) => d[yKey] || 0)));
	$: maxY = maxValue > 0 ? maxValue + (maxValue * 10) / 100 : 10;
</script>

<div class="chart-container mb-4 {heightClasses}">
	<LayerCake
		padding={{ top: 0, right: 0, bottom: 20, left: 0 }}
		x={xKey}
		y={yKey}
		{yDomain}
		data={dataset}
	>
		<Svg>
			<defs>
				<ClipPath id={`${id}-clip-path`} />
			</defs>

			{#if overlay}
				<Overlay fill="#FAF9F6" {...overlay} />
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
				formatTick={formatTickX}
				tickMarks={true}
				snapTicks={snapXTicks}
			/>

			<g clip-path={clipPathId ? `url(#${clipPathId})` : ''}>
				<Line stroke="#353535" {hoverData} {strokeWidth} {curveType} />
				{#if showArea}
					<Area fill={zKey} />
				{/if}
			</g>
			<HoverLayer {dataset} on:mousemove on:mouseout on:pointerup on:mousedown />
		</Svg>

		<Svg pointerEvents={false}>
			<defs>
				<HatchPattern id={`${id}-hatch-pattern`} stroke={overlayStroke} />
			</defs>
			{#if overlay}
				<Overlay fill="url(#{`${id}-hatch-pattern`})" {...overlay} />
			{/if}
			{#if overlayLine}
				<LineX xValue={overlayLine} />
			{/if}
		</Svg>

		<!-- <Html pointerEvents={false}>
			<HoverText {hoverData} position="bottom">
				<span class="text-[10px] block">
					{formatTickX(hoverTime)}
				</span>
			</HoverText>
		</Html> -->

		<Svg pointerEvents={false}>
			<g clip-path={clipPathId ? `url(#${clipPathId})` : ''}>
				{#if hoverData}
					<LineX xValue={hoverData} strokeArray="none" />
					<Dot value={hoverData} r={4} />
				{/if}
				{#if focusData}
					<LineX xValue={focusData} strokeArray="none" strokeColour="#C74523" />
					<Dot value={focusData} r={4} fill="#C74523" />
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
