<script>
	import { LayerCake, Svg, flatten, stack } from 'layercake';
	import { scaleOrdinal } from 'd3-scale';
	import { format } from 'd3-format';
	import { timeParse, timeFormat } from 'd3-time-format';

	import AreaStacked from '$lib/components/charts/AreaStacked.svelte';
	import AxisX from '$lib/components/charts/AxisX.svelte';
	import AxisY from '$lib/components/charts/AxisY.svelte';

	const data = [
		{
			month: '2015-04-01',
			apples: 3840,
			bananas: 1920,
			cherries: 960,
			dates: 400
		},
		{
			month: '2015-03-01',
			apples: 1600,
			bananas: 1440,
			cherries: 960,
			dates: 400
		},
		{
			month: '2015-02-01',
			apples: 640,
			bananas: 960,
			cherries: 640,
			dates: 400
		},
		{
			month: '2015-01-01',
			apples: 320,
			bananas: 480,
			cherries: 640,
			dates: 400
		}
	];

	const xKey = 'month';
	const yKey = [0, 1];
	const zKey = 'key';
	const xKeyCast = timeParse('%Y-%-m-%d');

	const seriesNames = Object.keys(data[0]).filter((d) => d !== xKey);
	const seriesColours = ['#ff00cc', '#ff7ac7', '#ffb3c0', '#ffe4b8'];

	const formatTickX = timeFormat('%b. %-d');
	const formatTickY = (d) => format('~s')(d);

	data.forEach((d) => {
		d[xKey] = xKeyCast(d[xKey]);
	});

	const stackedData = stack(data, seriesNames);
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
