<script>
	import { run } from 'svelte/legacy';

	import { LayerCake, Svg, Html } from 'layercake';
	import { curveStepAfter } from 'd3-shape';

	import Line from '$lib/components/charts/elements/Line.svelte';
	import DotAnnotation from '$lib/components/charts/elements/annotations/Dot.svelte';
	import AxisX from '$lib/components/charts/elements/AxisX.svelte';
	import AxisY from '$lib/components/charts/elements/AxisY.svelte';
	import Brush from '$lib/components/charts/elements/Brush.html.svelte';
	import ClipPath from '$lib/components/charts/elements/defs/ClipPath.svelte';

	/** @type {{ data: any[], issueInstanceIds?: any[] }} */
	let { data, issueInstanceIds = [] } = $props();

	/** @type {[number | null, number | null]} */
	let brushExtents = $state([null, null]);
	/** @type {any[]} */
	let brushedData = $state([]);

	const id = 'record-chart-' + new Date().getTime();

	run(() => {
		// brushed data should have at least 2 points to be able to draw a line
		brushedData = data.slice(
			(brushExtents[0] || 0) * data.length,
			(brushExtents[1] || 1) * data.length
		);
		if (brushedData.length < 2 && brushExtents[0] !== null) {
			brushedData = data.slice(brushExtents[0] * data.length, brushExtents[0] * data.length + 2);
		}
	});

	let isBrushed = $derived(brushExtents[0] !== null && brushExtents[1] !== null);

	run(() => {
		console.log('time series data', data);
	});

	let annotatedData = $derived(data.filter((/** @type {any} */ d) => issueInstanceIds.includes(d.instance_id)));

	/** @param {any} d */
	const formatTickX = (d) => {
		const date = new Date(d);
		return date.toLocaleString('en-AU', {});
	};
</script>

<div class="h-[200px] m-10 p-4">
	<LayerCake
		padding={{ top: 0, right: 10, bottom: 0, left: 10 }}
		x="date"
		y="value"
		data={brushedData}
	>
		<Svg>
			<defs>
				<ClipPath id={`${id}-clip-path`} />
			</defs>
			<AxisX formatTick={formatTickX} ticks={4} />
			<AxisY />

			<!-- TODO: DotAnnotation doesn't support clipPathId/annotateDots yet -->
			<!-- <DotAnnotation clipPathId={`${id}-clip-path`} fill="#FA6060" annotateDots={annotatedData} /> -->
			<Line curveType={curveStepAfter} stroke="#353535" strokeWidth="0.5px" showLineDots={true} />
		</Svg>
	</LayerCake>
</div>

<div class="h-[80px] m-10 mb-2 p-4 pb-2 bg-warm-grey">
	<LayerCake padding={{ top: 0, right: 10, bottom: 0, left: 10 }} x="date" y="value" {data}>
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
		class="border rounded-sm text-xs py-1 px-4"
		class:invisible={!isBrushed}
		onclick={() => (brushExtents = [null, null])}
	>
		reset
	</button>
</div>
