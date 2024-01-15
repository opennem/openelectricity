<script>
	import { LayerCake, Svg, Html, flatten, stack } from 'layercake';

	import { scaleOrdinal } from 'd3-scale';
	import { format as d3Format } from 'd3-format';
	import format from 'date-fns/format';

	import AreaStacked from '$lib/components/charts/AreaStacked.svelte';
	import AxisX from '$lib/components/charts/AxisX.svelte';
	import AxisY from '$lib/components/charts/AxisY.svelte';
	import HoverLine from '$lib/components/charts/HoverLine.html.svelte';

	export const formatTickX = (/** @type {Date} */ d) => format(d, 'd MMM, h:mm aaa');
	export const formatTickY = (/** @type {number} */ d) => d3Format('~s')(d);

	/** @type {import('$lib/types/chart.types').TimeSeriesData[]} */
	export let dataset = [];

	export let xKey = '';

	/** @type {number[]} */
	export let yKey = [];

	export let zKey = '';

	/** @type {string[]} */
	export let seriesNames = [];

	/** @type {string[]} */
	export let seriesColours = [];

	/** @type {*} */
	let evt;
	$: console.log('evt', evt);

	$: stackedData = stack(dataset, seriesNames);

	$: ticks = [dataset[0][xKey], dataset[dataset.length - 1][xKey]];

	// $: console.log('stackedData', stackedData, dataset, seriesNames, ticks);
</script>

<div class="chart-container">
	<LayerCake
		padding={{ top: 0, right: 10, bottom: 40, left: 25 }}
		x={(/** @type {*} */ d) => d.data[xKey]}
		y={yKey}
		z={zKey}
		zScale={scaleOrdinal()}
		zDomain={seriesNames}
		zRange={seriesColours}
		flatData={flatten(stackedData)}
		data={stackedData}
	>
		<Svg>
			<AreaStacked on:mousemove={(event) => (evt = event)} on:mouseout />
			<AxisY ticks={1} formatTick={formatTickY} gridlines={false} tickMarks={true} />
			<AxisX {ticks} gridlines={false} formatTick={formatTickX} tickMarks={true} snapTicks={true} />
		</Svg>

		<Html>
			<HoverLine
				{dataset}
				showHoverText={false}
				isShapeStack={true}
				formatValue={formatTickX}
				on:mousemove
				on:mouseout
			/>
		</Html>
	</LayerCake>
</div>

<style>
	.chart-container {
		width: 100%;
		height: 500px;
	}
</style>
