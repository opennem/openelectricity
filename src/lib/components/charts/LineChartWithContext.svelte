<script>
	import { run } from 'svelte/legacy';

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
	 * @property {any} store
	 * @property {boolean} [clip]
	 * @property {string} [xKey]
	 * @property {string} [zKey]
	 * @property {*} [overlay] - If true, overlay will take up the full width of the chart
If object with xStartValue and xEndValue, overlay will be a range
	 * @property {string} [overlayStroke]
	 * @property {*} [overlayLine]
	 * @property {string | null} [highlightId]
	 * @property {*} [customFormatTickX]
	 * @property {string} [heightClasses]
	 * @property {boolean} [showDots]
	 */

	/** @type {Props} */
	let {
		store,
		clip = true,
		xKey = 'date',
		zKey = '',
		overlay = null,
		overlayStroke = 'rgba(236, 233, 230, 0.4)',
		overlayLine = false,
		highlightId = null,
		customFormatTickX = null,
		heightClasses = $bindable(''),
		showDots = false
	} = $props();

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

	const id = getSeqId();
	const defaultChartHeightClasses = 'h-[150px] md:h-[200px]';

	run(() => {
		heightClasses = heightClasses || $chartHeightClasses || defaultChartHeightClasses;
	});

	// $: console.log('groupedData', groupedData);

	let clipPathId = $derived(clip ? `${id}-clip-path` : '');
	let clipPathAxisId = $derived(clip ? `${id}-clip-path-axis` : '');
	let yKey = $derived($yKeys[0] || '');
	let maxValue = $derived(Math.round(Math.max(...$dataset.map((d) => d[yKey] || 0))));
	let maxY = $derived(maxValue > 0 ? maxValue + (maxValue * 10) / 100 : 10);
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
					<!-- <Dot value={$focusData} r={4} {yKey} /> -->
				{/if}
			</g>
		</Svg>
	</LayerCake>

	<!-- <p class="text-xs text-mid-grey relative -top-5 md:hidden">{$title}</p> -->
</div>
