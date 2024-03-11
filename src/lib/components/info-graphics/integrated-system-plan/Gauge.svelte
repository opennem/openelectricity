<script>
	import { LayerCake, Svg } from 'layercake';

	import Arc from '$lib/components/charts/elements/Arc.svelte';

	/** @type {import('$lib/types/chart.types').TimeSeriesData[]} */
	export let dataset = [];

	/** @type {number[]} */
	export let xDomain = [];

	/** @type {number[]} */
	export let markerLines = [];

	/** @type {string} */
	export let xKey = '';

	export let fill = 'lightgrey';

	$: xMin = xDomain ? xDomain[0] : 0;
	$: xMax = xDomain ? xDomain[1] : 0;

	/** @type {{ start: number, end: number }[]} */
	let arcs = [];

	$: {
		arcs = [];

		if (markerLines.length > 0) {
			markerLines.forEach((d, i) => {
				const start = i === 0 ? xMin : markerLines[i - 1];
				const end = i === markerLines.length ? xMax : markerLines[i];

				arcs.push({ start, end });
			});
			arcs.push({ start: markerLines[markerLines.length - 1], end: xMax });
		} else {
			arcs.push({ start: xMin, end: xMax });
		}
	}
</script>

<div class="chart-container">
	<LayerCake
		data={dataset}
		x={xKey}
		{xDomain}
		xRange={[-Math.PI / 2, Math.PI / 2]}
		padding={{ top: 20, right: 0, bottom: 20, left: 0 }}
	>
		<Svg>
			{#each arcs as { start, end }, i (i)}
				<Arc {start} {end} {fill} />
			{/each}
		</Svg>
	</LayerCake>
</div>

<style>
	.chart-container {
		width: 100%;
		height: 100%;
	}
</style>
