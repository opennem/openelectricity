<script>
	import { LayerCake, Svg, Html, flatten, stack } from 'layercake';
	import { scaleOrdinal } from 'd3-scale';
	import { format as d3Format } from 'd3-format';
	import { formatInTimeZone } from 'date-fns-tz';

	import AreaStacked from '$lib/components/charts/AreaStacked.svelte';
	import AxisX from '$lib/components/charts/AxisX.svelte';
	import AxisY from '$lib/components/charts/AxisY.svelte';
	import HoverLine from '$lib/components/charts/HoverLine.html.svelte';
	import HoverText from '$lib/components/charts/HoverText.html.svelte';

	export const formatTickX = (/** @type {Date} */ d) =>
		formatInTimeZone(d, '+10:00', 'd MMM, h:mm aaa');
	export const formatTickY = (/** @type {number} */ d) => d3Format('.0f')(d / 1000);

	/** @type {TimeSeriesData[]} */
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

	$: stackedData = stack(dataset, seriesNames);
	$: ticks = [dataset[0][xKey], dataset[dataset.length - 1][xKey]];
	$: maxY = Math.round(Math.max(...dataset.map((d) => d._max || 0)));
</script>

<div class="chart-container">
	<LayerCake
		padding={{ top: 0, right: 0, bottom: 40, left: 0 }}
		x={(/** @type {*} */ d) => d.data[xKey]}
		y={yKey}
		z={zKey}
		zScale={scaleOrdinal()}
		zDomain={seriesNames}
		zRange={seriesColours}
		flatData={flatten(stackedData)}
		data={stackedData}
	>
		<Html>
			<div class="italic text-right text-xs text-dark-grey mr-8 -mt-8">
				Last 7 days Power Generation (GW)
			</div>
		</Html>

		<Svg>
			<AreaStacked on:mousemove={(event) => (evt = event)} on:mouseout />
			<AxisX {ticks} gridlines={true} formatTick={formatTickX} tickMarks={true} snapTicks={true} />
			<AxisY formatTick={formatTickY} gridlines={true} tickMarks={true} ticks={[0, maxY]} />
		</Svg>

		<Html>
			<!-- <HoverText /> -->
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
