<script>
	import { LayerCake, Svg, Html, flatten, stack } from 'layercake';
	import { tweened } from 'svelte/motion';
	import * as eases from 'svelte/easing';

	import { scaleOrdinal } from 'd3-scale';

	import { formatTickY } from './helpers';

	import AreaStacked from '$lib/components/charts/AreaStacked.svelte';
	import AxisX from '$lib/components/charts/AxisX.svelte';
	import AxisY from '$lib/components/charts/AxisY.svelte';
	import HoverLine from '$lib/components/charts/HoverLine.html.svelte';
	import HoverDots from '$lib/components/charts/HoverDots.svelte';
	import Overlay from '$lib/components/charts/Overlay.svelte';
	import HatchPattern from '$lib/components/charts/defs/HatchPattern.svelte';

	import ChartAnnotations from './ChartAnnotations.svelte';

	/** @type {import('$lib/types/chart.types').TimeSeriesData[]} */
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

	/** @type {string[]} */
	export let seriesColours = [];

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
</script>

<div class="chart-container">
	<LayerCake
		padding={{ top: 0, right: 0, bottom: 40, left: 0 }}
		x={(/** @type {*} */ d) => d.data[xKey]}
		y={yKey}
		yDomain={[0, $yTweened]}
		z={zKey}
		zScale={scaleOrdinal()}
		zDomain={seriesNames}
		zRange={seriesColours}
		flatData={flatten(stackedData)}
		data={stackedData}
	>
		<Html>
			<div class="absolute top-0 left-0 right-0 bottom-0 {bgClass}" role="presentation" />
		</Html>

		<Svg>
			<defs>
				<HatchPattern id="hatch-pattern" />
			</defs>

			<AxisY ticks={yTicks} xTick={5} formatTick={formatTickY} gridlines={false} />
			<AxisX ticks={xTicks} gridlines={false} formatTick={formatTickX} tickMarks={true} />

			<AreaStacked on:mousemove={(event) => (evt = event)} on:mouseout />

			{#if overlay}
				<Overlay fill="url(#hatch-pattern)" />
			{/if}
		</Svg>

		<Html pointerEvents={false}>
			<ChartAnnotations {title} {description} />
		</Html>

		<Html>
			<HoverLine
				{dataset}
				{hoverData}
				isShapeStack={true}
				useDataHeight={true}
				formatValue={formatTickX}
				on:mousemove
				on:mouseout
			/>
		</Html>

		<Svg pointerEvents={false}>
			<HoverDots {dataset} {hoverData} />
		</Svg>
	</LayerCake>
</div>

<style>
	.chart-container {
		width: 100%;
		height: 650px;
	}
</style>
