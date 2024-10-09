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

	export let store;

	const {
		title,
		seriesNames: yKeys,
		seriesData: dataset,
		xTicks,
		yTicks,
		snapXTicks,
		formatTickX,
		convertAndFormatValue: formatTickY,
		hoverData,
		focusData,
		chartHeightClasses,
		curveType,
		xDomain,
		yDomain,
		strokeWidth,
		showLineArea: showArea,
		lineColour,
		dotStroke,
		dotFill
	} = store;

	export let clip = true;

	export let xKey = 'date';

	export let zKey = '';

	/** If true, overlay will take up the full width of the chart
	 * If object with xStartValue and xEndValue, overlay will be a range
	 * @type {*} */
	export let overlay = null;

	export let overlayStroke = 'rgba(236, 233, 230, 0.4)';

	/** @type {*} */
	export let overlayLine = false;

	/** @type {string | null} */
	export let highlightId = null;

	/** @type {*} */
	export let customFormatTickX = null;

	/** @type {string} */
	export let heightClasses = '';

	export let showDots = false;

	const id = getSeqId();
	const defaultChartHeightClasses = 'h-[150px] md:h-[200px]';

	$: heightClasses = heightClasses || $chartHeightClasses || defaultChartHeightClasses;

	// $: console.log('groupedData', groupedData);

	$: clipPathId = clip ? `${id}-clip-path` : '';
	$: clipPathAxisId = clip ? `${id}-clip-path-axis` : '';
	$: yKey = $yKeys[0] || '';
	$: maxValue = Math.round(Math.max(...$dataset.map((d) => d[yKey] || 0)));
	$: maxY = maxValue > 0 ? maxValue + (maxValue * 10) / 100 : 10;
</script>

<div class="w-full {heightClasses}">
	<LayerCake
		padding={{ top: 0, right: 0, bottom: 20, left: 0 }}
		x={xKey}
		y={yKey}
		xScale={scaleUtc()}
		yDomain={$yDomain}
		xDomain={$xDomain}
		data={$dataset}
	>
		<Svg>
			<defs>
				<ClipPath id={clipPathId} />
				<ClipPath customPaddingLeft={20} customPaddingRight={20} id={clipPathAxisId} />
			</defs>

			{#if overlay}
				<Overlay fill="#FAF9F6" {...overlay} />
			{/if}

			<AxisY
				ticks={$yTicks}
				xTick={5}
				formatTick={$formatTickY}
				gridlines={true}
				stroke="#33333344"
			/>
			<AxisX
				ticks={$xTicks}
				gridlines={true}
				strokeArray="3"
				stroke="#33333344"
				formatTick={customFormatTickX || $formatTickX}
				tickMarks={true}
				snapTicks={$snapXTicks}
				clipPathId={clipPathAxisId}
			/>

			<g clip-path={clipPathId ? `url(#${clipPathId})` : ''}>
				<Line
					stroke={$lineColour}
					hoverData={$hoverData}
					strokeWidth={$strokeWidth}
					curveType={$curveType}
					{showDots}
					dotStroke={$dotStroke}
					dotFill={$dotFill}
				/>
				{#if $showArea}
					<Area fill={zKey} />
				{/if}
			</g>
			<HoverLayer dataset={$dataset} on:mousemove on:mouseout on:pointerup on:mousedown />
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

		<Svg pointerEvents={false}>
			<g clip-path={clipPathId ? `url(#${clipPathId})` : ''}>
				{#if $hoverData}
					<LineX xValue={$hoverData} strokeArray="none" />
					<Dot value={$hoverData} r={4} />
				{/if}
				{#if $focusData}
					<LineX xValue={$focusData} strokeArray="none" strokeColour="#C74523" />
					<Dot value={$focusData} r={4} fill="#C74523" />
				{/if}
			</g>
		</Svg>
	</LayerCake>

	<!-- <p class="text-xs text-mid-grey relative -top-5 md:hidden">{$title}</p> -->
</div>
