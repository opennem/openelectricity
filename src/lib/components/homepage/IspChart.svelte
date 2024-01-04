<script>
	import { LayerCake, Svg, Html, flatten, stack } from 'layercake';
	import { scaleOrdinal } from 'd3-scale';
	import { format } from 'd3-format';
	import { format as dateFormat } from 'date-fns';

	import AreaStacked from '$lib/components/charts/AreaStacked.svelte';
	import AxisX from '$lib/components/charts/AxisX.svelte';
	import AxisY from '$lib/components/charts/AxisY.svelte';
	import HoverLine from '$lib/components/charts/HoverLine.html.svelte';

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

	const formatTickX = (/** @type {Date} */ d) => dateFormat(d, 'yyyy');
	const formatTickY = (/** @type {number} */ d) => format('~s')(d);

	/** @type {*} */
	let evt;
	$: console.log('evt', evt);

	$: stackedData = stack(dataset, seriesNames);
	$: allYears = [...new Set(dataset.map((d) => d.date))];
</script>

<div class="chart-container">
	<LayerCake
		padding={{ top: 20, right: 0, bottom: 20, left: 0 }}
		x={(/** @type {*} */ d) => d.data[xKey]}
		y={yKey}
		{yDomain}
		yNice={4}
		z={zKey}
		zScale={scaleOrdinal()}
		zDomain={seriesNames}
		zRange={seriesColours}
		flatData={flatten(stackedData)}
		data={stackedData}
	>
		<Svg>
			<defs>
				<pattern
					id="hatch-pattern"
					width="4"
					height="4"
					patternUnits="userSpaceOnUse"
					patternTransform="rotate(45)"
				>
					<line stroke="rgba(236, 233, 230, 0.3)" stroke-width="2px" y2="10" />
				</pattern>
			</defs>

			<AxisY formatTick={formatTickY} />
			<AxisX ticks={allYears} formatTick={formatTickX} tickMarks={true} snapTicks={true} />

			<AreaStacked />
			<AreaStacked
				fill="url(#hatch-pattern)"
				on:mousemove={(event) => (evt = event.detail)}
				on:mouseout
			/>
		</Svg>

		<Html>
			<HoverLine {dataset} />
		</Html>
	</LayerCake>
</div>

<style>
	.chart-container {
		width: 100%;
		height: 650px;
	}
</style>
