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
	export let zKey = 'key';

	export let seriesNames = [];
	export let seriesColours = [];

	const formatTickX = timeFormat('%Y');
	const formatTickY = (d) => format('~s')(d);

	$: stackedData = stack(data, seriesNames);
	$: console.log('stackedData', data, seriesNames, stackedData);
</script>

<div class="chart-container">
	<LayerCake
		padding={{ top: 8, right: 10, bottom: 20, left: 25 }}
		x={(d) => d.data[xKey]}
		y={yKey}
		z={zKey}
		zScale={scaleOrdinal()}
		zDomain={seriesNames}
		zRange={seriesColours}
		flatData={flatten(stackedData)}
		data={stackedData}
	>
		<Svg>
			<AxisX formatTick={formatTickX} tickMarks={true} />
			<AxisY formatTick={formatTickY} />
			<AreaStacked />
		</Svg>
	</LayerCake>
</div>

<style>
	.chart-container {
		width: 100%;
		height: 450px;
		padding: 1rem;
	}
</style>
