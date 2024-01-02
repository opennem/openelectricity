<script>
	import { getContext } from 'svelte';

	const { data, xGet, yGet } = getContext('LayerCake');

	/** @type {string} = shape's fill colour */
	export let stroke = '#ababab';

	$: path = 'M' + $data.map((d) => `${$xGet(d)},${$yGet(d)}`).join('L');
</script>

<path class="path-line" d={path} {stroke} />

<style>
	.path-line {
		fill: none;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 2;
	}
</style>
