<script>
	import { LayerCake, Svg, Html, flatten, stack, groupLonger } from 'layercake';
	import { tweened } from 'svelte/motion';
	import * as eases from 'svelte/easing';

	import { scaleOrdinal } from 'd3-scale';

	import { formatTickY, displayXTicks } from './helpers';

	import AreaStacked from '$lib/components/charts/elements/AreaStacked.svelte';
	import AxisX from '$lib/components/charts/elements/AxisX.svelte';
	import AxisY from '$lib/components/charts/elements/AxisY.svelte';
	import HoverLayer from '$lib/components/charts/elements/HoverLayer.svelte';
	import HoverLine from '$lib/components/charts/elements/HoverLine.html.svelte';
	import HoverDots from '$lib/components/charts/elements/HoverDots.svelte';
	import HoverText from '$lib/components/charts/elements/HoverText.html.svelte';
	import Overlay from '$lib/components/charts/elements/Overlay.svelte';
	import HatchPattern from '$lib/components/charts/elements/defs/HatchPattern.svelte';

	import ChartAnnotations from './ChartAnnotations.svelte';

	/** @type {TimeSeriesData[]} */
	export let dataset = [];

	export let title = '';
	export let description = '';

	export let xKey = '';

	/** @type {number[]} */
	export let yKey = [];

	/** @type {number[] | undefined} */
	export let yDomain = undefined;

	export let zKey = '';

	/** @type {string[]} */
	export let seriesNames = [];

	/** @type {Object.<string, string>} legend colour */
	export let seriesColours = {};

	/** @type {*} */
	export let xTicks = undefined;

	/** @type {*} */
	export let yTicks = undefined;

	export let overlay = false;

	export let bgClass = '';

	/** @type {TimeSeriesData | undefined}*/
	export let hoverData = undefined;

	/** @type {Function} A function that passes the current tick value and expects a nicely formatted value in return. */
	export let formatTickX = (/** @type {*} */ d) => d;

	/** TODO: work out transition */
	const tweenOptions = {
		duration: 750,
		easing: eases.cubicInOut
	};
	const yTweened = tweened(/** @type {number|null} */ (null), tweenOptions);

	$: maxY = yDomain ? yDomain[1] : null;
	// $: maxArr = [...dataset.map((d) => d._max)];
	// @ts-ignore
	// $: datasetMax = maxArr ? Math.max(...maxArr) : 0;
	$: if (dataset) yTweened.set(maxY);

	$: console.log('maxY', maxY);
	/** end */

	/** @type {*} */
	let evt;
	$: console.log('evt', evt);

	$: stackedData = stack(dataset, seriesNames);
	$: hoverTime = hoverData ? hoverData.time || 0 : 0;
</script>

<div class="chart-container">
	<LayerCake
		padding={{ top: 0, right: 0, bottom: 40, left: 0 }}
		x={(/** @type {*} */ d) => d[xKey] || d.data[xKey]}
		y={yKey}
		yDomain={[0, $yTweened]}
		z={zKey}
		zScale={scaleOrdinal()}
		zDomain={seriesNames}
		zRange={Object.values(seriesColours)}
		flatData={flatten(stackedData)}
		data={stackedData}
	>
		<Html pointerEvents={false}>
			<div class="absolute top-0 left-0 right-0 bottom-0 {bgClass}" role="presentation" />
		</Html>

		<Svg>
			<AreaStacked on:mousemove={(event) => (evt = event)} on:mouseout />

			<HoverLayer {dataset} on:mousemove on:mouseout />
		</Svg>

		<Svg pointerEvents={false}>
			<defs>
				<HatchPattern id="hatch-pattern" />
			</defs>

			{#if overlay}
				<Overlay fill="url(#hatch-pattern)" />
			{/if}

			<AxisY ticks={yTicks} xTick={5} formatTick={formatTickY} gridlines={false} />
			<AxisX
				ticks={xTicks || displayXTicks}
				gridlines={false}
				formatTick={formatTickX}
				tickMarks={true}
			/>
		</Svg>

		<Html pointerEvents={false}>
			<ChartAnnotations {title} {description} />

			<HoverText {hoverData} isShapeStack={true} position="bottom">
				<span class="text-[10px] block">
					{formatTickX(hoverTime)}
				</span>
			</HoverText>
			<HoverLine {hoverData} isShapeStack={true} useDataHeight={true} />
		</Html>

		<Svg pointerEvents={false}>
			<HoverDots {dataset} {hoverData} />
		</Svg>
	</LayerCake>
</div>

<style>
	.chart-container {
		width: 100%;
		height: 680px;
	}
</style>
