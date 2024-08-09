<script>
	import { LayerCake, Svg, Html } from 'layercake';
	import { curveStepAfter } from 'd3-shape';

	import Line from '$lib/components/charts/elements/Line.svelte';
	import DotAnnotation from '$lib/components/charts/elements/annotations/Dot.svelte';
	import AxisX from '$lib/components/charts/elements/AxisX.svelte';
	import AxisY from '$lib/components/charts/elements/AxisY.svelte';
	import Brush from '$lib/components/charts/elements/Brush.html.svelte';
	import ClipPath from '$lib/components/charts/elements/defs/ClipPath.svelte';

	export let data;
	export let issueInstanceIds = [];

	let brushExtents = [null, null];
	let brushedData = [];

	const id = 'record-chart-' + new Date().getTime();

	$: {
		brushedData = data.slice(
			(brushExtents[0] || 0) * data.length,
			(brushExtents[1] || 1) * data.length
		);
		if (brushedData.length < 2) {
			brushedData = data.slice(brushExtents[0] * data.length, brushExtents[0] * data.length + 2);
		}
	}

	$: isBrushed = brushExtents[0] !== null && brushExtents[1] !== null;

	$: console.log('time series data', data);

	$: annotatedData = data.filter((d) => issueInstanceIds.includes(d.instance_id));

	const formatTickX = (d) => {
		const date = new Date(d);
		return date.toLocaleString('en-AU', {});
	};
</script>

<div class="h-[200px] m-10 p-4">
	<LayerCake
		padding={{ top: 0, right: 10, bottom: 0, left: 10 }}
		x={'date'}
		y={'value'}
		data={brushedData}
	>
		<Svg>
			<defs>
				<ClipPath id={`${id}-clip-path`} />
			</defs>
			<AxisX formatTick={formatTickX} ticks={4} />
			<AxisY />

			<DotAnnotation clipPathId={`${id}-clip-path`} fill="#FA6060" annotateDots={annotatedData} />
			<Line curveType={curveStepAfter} stroke="#353535" strokeWidth="0.5px" showDots={true} />
		</Svg>
	</LayerCake>
</div>

<div class="h-[80px] m-10 mb-2 p-4 pb-2 bg-warm-grey">
	<LayerCake padding={{ top: 0, right: 10, bottom: 0, left: 10 }} x={'date'} y={'value'} {data}>
		<Svg>
			<Line curveType={curveStepAfter} stroke="#353535" strokeWidth="1.5px" />
		</Svg>
		<Html>
			<Brush bind:min={brushExtents[0]} bind:max={brushExtents[1]} />
		</Html>
	</LayerCake>
</div>

<div class="text-center">
	<button
		class="border rounded text-xs py-1 px-4"
		class:invisible={!isBrushed}
		on:click={() => (brushExtents = [null, null])}
	>
		reset
	</button>
</div>
