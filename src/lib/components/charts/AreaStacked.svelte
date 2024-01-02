<script>
	import { getContext } from 'svelte';
	import { area } from 'd3-shape';

	const { data, xGet, yScale, zGet } = getContext('LayerCake');

	/** @type {string|null} */
	export let fill = null;

	$: areaGen = area()
		.x((d) => $xGet(d))
		.y0((d) => $yScale(d[0]))
		.y1((d) => $yScale(d[1]));

	/**
	 * @param d {[]}
	 * @returns {string}
	 */
	function getZFill(d) {
		return fill ? fill : $zGet(d);
	}
</script>

<g class="area-group">
	{#each $data as d}
		<path class="path-area" d={areaGen(d)} fill={getZFill(d)} />
	{/each}
</g>
