<script>
	import { getContext } from 'svelte';

	const { data, xGet, yGet } = getContext('LayerCake');

	/** @type {string} shape's fill colour */
	export let stroke = '#ababab';

	/** @type {TimeSeriesData | undefined} */
	export let hoverData = undefined;

	$: cx = hoverData ? $xGet(hoverData) : 0;
	$: cy = hoverData ? $yGet(hoverData) : 0;

	$: path =
		'M' + $data.map((/** @type {number|string} */ d) => `${$xGet(d)},${$yGet(d)}`).join('L');
</script>

<path class="path-line" d={path} {stroke} />
{#if hoverData}
	<circle {cx} {cy} r="6" fill={stroke} />
{/if}

<style>
	.path-line {
		fill: none;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 2px;
	}
</style>
