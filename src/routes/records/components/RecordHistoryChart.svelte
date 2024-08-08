<script>
	import { LayerCake, Svg, Html } from 'layercake';
	import Line from '$lib/components/charts/elements/Line.svelte';
	import AxisX from '$lib/components/charts/elements/AxisX.svelte';
	import AxisY from '$lib/components/charts/elements/AxisY.svelte';

	import { parseISO } from 'date-fns';

	export let data;

	$: timeSeriesData = data
		.map((record) => {
			const date = parseISO(record.interval);
			return {
				date,
				time: date.getTime(),
				value: record.value
			};
		})
		.sort((a, b) => a.time - b.time);

	$: console.log('time series data', timeSeriesData);

	const formatTickX = (d) => {
		const date = new Date(d);
		return date.toLocaleString('en-AU', {});
	};
</script>

<div class="h-[200px] m-10 p-10">
	<LayerCake
		padding={{ top: 0, right: 0, bottom: 20, left: 0 }}
		x={'date'}
		y={'value'}
		data={timeSeriesData}
	>
		<Svg>
			<AxisX formatTick={formatTickX} ticks={4} />
			<AxisY />
			<Line stroke="#353535" strokeWidth="1px" showDots={true} />
		</Svg>
	</LayerCake>
</div>
