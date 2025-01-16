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

	/**
	 * @typedef {Object} Props
	 * @property {TimeSeriesData[]} [dataset]
	 * @property {string} [title]
	 * @property {boolean} [clip]
	 * @property {string} [xKey]
	 * @property {number[] | number} [yKey]
	 * @property {Array.<number | null> | undefined} [yDomain]
	 * @property {*} [xDomain]
	 * @property {string} [zKey]
	 * @property {string[]} [seriesNames]
	 * @property {string[]} [zRange]
	 * @property {*} [xTicks]
	 * @property {*} [yTicks]
	 * @property {Boolean} [snapTicks]
	 * @property {boolean} [xGridlines]
	 * @property {any} [chartPadding]
	 * @property {*} [overlay] - If true, overlay will take up the full width of the chart
If object with xStartValue and xEndValue, overlay will be a range
	 * @property {string} [overlayStroke]
	 * @property {*} [blankOverlay]
	 * @property {{ date: Date } | undefined} [overlayLine]
	 * @property {string} [chartType] - line, area
	 * @property {TimeSeriesData | undefined} [hoverData]
	 * @property {TimeSeriesData | undefined} [focusData]
	 * @property {Function} [formatTickX]
	 * @property {any} [formatTickY]
	 * @property {string} [chartHeightClasses]
	 * @property {any} [curveFunction]
	 * @property {string | undefined} [highlightId]
	 */

	/** @type {Props} */
	let {
		dataset = [],
		title = '',
		clip = true,
		xKey = 'date',
		yKey = [],
		yDomain = undefined,
		xDomain = undefined,
		zKey = '',
		seriesNames = [],
		zRange = [],
		xTicks = undefined,
		yTicks = undefined,
		snapTicks = true,
		xGridlines = false,
		chartPadding = { top: 0, right: 0, bottom: 40, left: 0 },
		overlay = null,
		overlayStroke = 'rgba(236, 233, 230, 0.4)',
		blankOverlay = false,
		overlayLine = undefined,
		chartType = 'area',
		hoverData = undefined,
		focusData = undefined,
		formatTickX = (/** @type {*} */ d) => d,
		formatTickY = (/** @type {number} */ d) => d,
		chartHeightClasses = '',
		curveFunction = null,
		highlightId = ''
	} = $props();

	const id = getSeqId();
	const defaultChartHeightClasses = 'h-[150px] md:h-[200px]';

	/** TODO: work out transition */
	const tweenOptions = {
		duration: 750,
		easing: eases.cubicInOut
	};
	const yTweened = tweened(/** @type {number|null} */ (null), tweenOptions);

	let isLine = $derived(chartType === 'line');
	let isArea = $derived(chartType === 'area');
	let stackedData = $derived(stack(dataset, seriesNames));
	let groupedData = $derived(dataset ? groupLonger(dataset, seriesNames) : []);
	let chartData = $derived(isArea ? stackedData : groupedData);
	let flatData = $derived(isArea ? flatten(stackedData) : flatten(groupedData, 'values'));
	let y = $derived(isArea ? yKey : 'value');
	let z = $derived(isArea ? zKey : 'group');
	let clipPathId = $derived(clip ? `${id}-clip-path` : '');
	let clipPathAxisId = $derived(clip ? `${id}-clip-path-axis` : '');

	let heightClasses = $derived(chartHeightClasses || defaultChartHeightClasses);
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

		<Svg pointerEvents={false}>
			<defs>
				<HatchPattern id={`${id}-hatch-pattern`} stroke={overlayStroke} />
				<ClipPath customPaddingLeft={15} customPaddingRight={15} id={clipPathAxisId} />
			</defs>

			<g clip-path={clipPathAxisId ? `url(#${clipPathAxisId})` : ''}>
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
