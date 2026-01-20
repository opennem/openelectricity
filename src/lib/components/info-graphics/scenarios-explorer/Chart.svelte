<script>
	import { LayerCake, Svg, Html, flatten, stack, groupLonger } from 'layercake';
	import { tweened } from 'svelte/motion';
	import * as eases from 'svelte/easing';

	import { scaleOrdinal, scaleUtc } from 'd3-scale';

	import { formatTickY, displayXTicks } from './helpers';

	import AreaStacked from '$lib/components/charts/elements/AreaStacked.svelte';

	import AxisX from '$lib/components/charts/elements/AxisX.svelte';
	import AxisY from '$lib/components/charts/elements/AxisY.svelte';
	import HoverLayer from '$lib/components/charts/elements/HoverLayer.svelte';
	import HoverLine from '$lib/components/charts/elements/HoverLine.html.svelte';
	import ClipPath from '$lib/components/charts/elements/defs/ClipPath.svelte';
	import HoverText from '$lib/components/charts/elements/HoverText.html.svelte';
	import Overlay from '$lib/components/charts/elements/Overlay.svelte';
	import HatchPattern from '$lib/components/charts/elements/defs/HatchPattern.svelte';
	import LineX from '$lib/components/charts/elements/annotations/LineX.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {TimeSeriesData[]} [dataset]
	 * @property {string} [title]
	 * @property {string} [id]
	 * @property {boolean} [clip]
	 * @property {string} [xKey]
	 * @property {number[]} [yKey]
	 * @property {Array.<number | null> | undefined} [yDomain]
	 * @property {string} [zKey]
	 * @property {string[]} [seriesNames]
	 * @property {Object.<string, string>} [seriesColours]
	 * @property {*} [xTicks]
	 * @property {*} [yTicks]
	 * @property {*} [overlay] - If true, overlay will take up the full width of the chart
If object with xStartValue and xEndValue, overlay will be a range
	 * @property {string} [overlayStroke]
	 * @property {*} [blankOverlay]
	 * @property {*} [overlayLine]
	 * @property {string} [display] - line, area
	 * @property {TimeSeriesData | undefined} [hoverData]
	 * @property {Function} [formatTickX]
	 * @property {string} [chartHeightClasses]
	 * @property {string | null} [highlightId]
	 */

	/** @type {Props} */
	let {
		dataset = [],
		title = '',
		id = '',
		clip = true,
		xKey = 'date',
		yKey = [],
		yDomain = undefined,
		zKey = '',
		seriesNames = [],
		seriesColours = {},
		xTicks = undefined,
		yTicks = undefined,
		overlay = null,
		overlayStroke = 'rgba(236, 233, 230, 0.4)',
		blankOverlay = false,
		overlayLine = false,
		display = 'area',
		hoverData = undefined,
		formatTickX = (/** @type {*} */ d) => d,
		chartHeightClasses = 'h-[400px] md:h-[580px]',
		highlightId = null
	} = $props();

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

	let stackedData = $derived(stack(dataset, seriesNames));
	let groupedData = $derived(dataset ? groupLonger(dataset, seriesNames) : []);
	let chartData = $derived(display === 'area' ? stackedData : groupedData);
	let flatData = $derived(
		display === 'area' ? flatten(stackedData) : flatten(groupedData, 'values')
	);
	let y = $derived(display === 'area' ? yKey : 'value');
	let z = $derived(display === 'area' ? zKey : 'group');

	// $: console.log('groupedData', groupedData);

	let hoverTime = $derived(hoverData ? hoverData.time || 0 : 0);
</script>

<div class="chart-container mb-4 {chartHeightClasses}">
	<LayerCake
		padding={{ top: 0, right: 0, bottom: 40, left: 0 }}
		x={(/** @type {*} */ d) => {
			// return display === 'area' ? d[xKey] || d.data[xKey] : 'date';
			return d[xKey] || d.data[xKey];
		}}
		{y}
		{z}
		{yDomain}
		xScale={scaleUtc()}
		zScale={scaleOrdinal()}
		zDomain={seriesNames}
		zRange={Object.values(seriesColours)}
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
				{display}
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
				ticks={xTicks || displayXTicks}
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
