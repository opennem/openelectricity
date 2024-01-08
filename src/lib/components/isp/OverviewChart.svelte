<script>
	import { LayerCake, Svg, Html, flatten, stack } from 'layercake';
	import { tweened } from 'svelte/motion';
	import * as eases from 'svelte/easing';

	import { scaleOrdinal } from 'd3-scale';

	import { formatTickX, formatTickY } from './helpers';

	import AreaStacked from '$lib/components/charts/AreaStacked.svelte';
	import AxisX from '$lib/components/charts/AxisX.svelte';
	import AxisY from '$lib/components/charts/AxisY.svelte';
	import HoverLine from '$lib/components/charts/HoverLine.html.svelte';
	import Overlay from '$lib/components/charts/Overlay.svelte';
	import HatchPattern from '$lib/components/charts/defs/HatchPattern.svelte';

	/** @type {import('$lib/types/chart.types').TimeSeriesData[]} */
	export let dataset = [];

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
	// $: allYears = [...new Set(dataset.map((d) => d.date))];
	const someYears = [
		new Date('2050-01-01'),
		new Date('2040-01-01'),
		new Date('2030-01-01'),
		new Date('2024-01-01')
	];
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
		<Svg>
			<defs>
				<HatchPattern id="hatch-pattern" />
			</defs>

			<AxisY ticks={2} xTick={5} formatTick={formatTickY} gridlines={true} />
			<AxisX ticks={someYears} gridlines={false} formatTick={formatTickX} tickMarks={true} />

			<AreaStacked on:mousemove={(event) => (evt = event)} on:mouseout />
			<Overlay fill="url(#hatch-pattern)" />
		</Svg>

		<Html>
			<HoverLine {dataset} formatValue={formatTickX} />
		</Html>
	</LayerCake>
</div>

<style>
	.chart-container {
		width: 100%;
		height: 650px;
	}
</style>
