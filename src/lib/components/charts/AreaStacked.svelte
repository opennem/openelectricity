<script>
	import { getContext, createEventDispatcher } from 'svelte';
	import { area } from 'd3-shape';

	const { data, xGet, yScale, zGet } = getContext('LayerCake');
	const dispatch = createEventDispatcher();

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

	function handleMousemove(e, d) {
		dispatch('mousemove', { e, data: d });
	}
</script>

<g
	class="area-group"
	role="group"
	on:mouseout={() => {
		dispatch('mouseout');
	}}
	on:blur={() => {
		dispatch('mouseout');
	}}
>
	{#each $data as d}
		<path
			role="presentation"
			class="path-area focus:outline-0"
			d={areaGen(d)}
			fill={getZFill(d)}
			on:mouseover={(e) => {
				handleMousemove(e, d);
			}}
			on:focus={(e) => {
				handleMousemove(e, d);
			}}
		/>
	{/each}
</g>
