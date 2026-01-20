<script>
	import { LayerCake, Svg } from 'layercake';
	import { scaleUtc } from 'd3-scale';

	import getSeqId from '$lib/utils/html-id-gen';
	import Line from './elements/Line.svelte';
	import Area from './elements/Area.svelte';
	import AxisX from './elements/AxisX.svelte';
	import AxisY from './elements/AxisY.svelte';
	import HoverLayer from './elements/HoverLayer.svelte';
	import ClipPath from './elements/defs/ClipPath.svelte';
	import Overlay from './elements/Overlay.svelte';
	import HatchPattern from './elements/defs/HatchPattern.svelte';
	import LineX from './elements/annotations/LineX.svelte';
	import Dot from './elements/annotations/Dot.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {TimeSeriesData[]} [dataset]
	 * @property {string} [title]
	 * @property {boolean} [clip]
	 * @property {string} [xKey]
	 * @property {string} [yKey]
	 * @property {Array.<number | null> | undefined} [yDomain]
	 * @property {string} [zKey]
	 * @property {*} [xTicks]
	 * @property {boolean} [snapXTicks]
	 * @property {*} [yTicks]
	 * @property {*} [overlay] - If true, overlay will take up the full width of the chart
If object with xStartValue and xEndValue, overlay will be a range
	 * @property {string} [overlayStroke]
	 * @property {*} [overlayLine]
	 * @property {any} [curveType]
	 * @property {string} [strokeWidth]
	 * @property {TimeSeriesData | undefined} [hoverData]
	 * @property {TimeSeriesData | undefined} [focusData]
	 * @property {Function} [formatTickX]
	 * @property {any} [formatTickY]
	 * @property {string} [chartHeightClasses]
	 * @property {string | null} [highlightId]
	 * @property {boolean} [showArea]
	 */

	/** @type {Props} */
	let {
		dataset = [],
		title = '',
		clip = true,
		xKey = 'date',
		yKey = '',
		yDomain = undefined,
		zKey = '',
		xTicks = undefined,
		snapXTicks = true,
		yTicks = undefined,
		overlay = null,
		overlayStroke = 'rgba(236, 233, 230, 0.4)',
		overlayLine = false,
		curveType = undefined,
		strokeWidth = '2px',
		hoverData = undefined,
		focusData = undefined,
		formatTickX = (/** @type {*} */ d) => d,
		formatTickY = (/** @type {number} */ d) => d,
		chartHeightClasses = '',
		_highlightId = null,
		showArea = true
	} = $props();

	const id = getSeqId();
	const defaultChartHeightClasses = 'h-[150px] md:h-[200px]';

	let heightClasses = $derived(chartHeightClasses || defaultChartHeightClasses);

	let clipPathId = $derived(clip ? `${id}-clip-path` : '');
</script>

<div class="chart-container mb-4 {heightClasses}">
	<LayerCake
		padding={{ top: 0, right: 0, bottom: 0, left: 0 }}
		x={xKey}
		y={yKey}
		xScale={scaleUtc()}
		{yDomain}
		data={dataset}
	>
		<Svg>
			<defs>
				<ClipPath id={clipPathId} />
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
				{clipPathId}
			/>

			<AxisX
				ticks={xTicks}
				gridlines={false}
				formatTick={formatTickX}
				tickMarks={true}
				snapTicks={snapXTicks}
			/>

			<g clip-path={clipPathId ? `url(#${clipPathId})` : ''}>
				<Line {clipPathId} stroke="#353535" {hoverData} {strokeWidth} {curveType} />
				{#if showArea}
					<Area {clipPathId} fill={zKey} />
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
					<!-- <Dot value={focusData} r={4} fill="#C74523" {yKey} /> -->
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
