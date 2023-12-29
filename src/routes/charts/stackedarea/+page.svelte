<script>
	import { timeParse } from 'd3-time-format';
	import IspChart from '$lib/components/homepage/IspChart.svelte';

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
	const xKeyCast = timeParse('%Y-%-m-%d');
	const seriesNames = Object.keys(data[0]).filter((d) => d !== xKey);
	const seriesColours = ['#ff00cc', '#ff7ac7', '#ffb3c0', '#ffe4b8'];

	data.forEach((d) => {
		d[xKey] = xKeyCast(d[xKey]);
	});
</script>

<IspChart {data} {xKey} yKey={[0, 1]} zKey="key" {seriesNames} {seriesColours} />
