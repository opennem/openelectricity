<script>
	import { LayerCake, Svg, flatten, stack } from 'layercake';
	import { scaleOrdinal } from 'd3-scale';
	import { format } from 'd3-format';
	import { timeFormat } from 'd3-time-format';

	import AreaStacked from '$lib/components/charts/AreaStacked.svelte';
	import AxisX from '$lib/components/charts/AxisX.svelte';
	import AxisY from '$lib/components/charts/AxisY.svelte';

	export let data = [];
	export let xKey = '';
	export let yKey = [];
	export let yDomain = undefined;
	export let zKey = 'key';

	export let seriesNames = [];
	export let seriesColours = [];

	const formatTickX = timeFormat('%Y');
	const formatTickY = (d) => format('~s')(d);

	$: stackedData = stack(data, seriesNames);
</script>

<div class="chart-container">
	<LayerCake
		padding={{ top: 20, right: 0, bottom: 20, left: 0 }}
		x={(d) => d.data[xKey]}
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
			<AxisX formatTick={formatTickX} tickMarks={true} />

			<AreaStacked />
			<AreaStacked fill="url(#hatch-pattern)" />
		</Svg>
	</LayerCake>
</div>

<style>
	.chart-container {
		width: 100%;
		height: 650px;
	}
</style>
