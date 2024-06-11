<script>
	import { getContext } from 'svelte';
	import { line } from 'd3-shape';

	const { data, xGet, yGet } = getContext('LayerCake');

	/** @type {string} shape's fill colour */
	export let stroke = '#ababab';

	export let strokeWidth = '2px';

	export let showCircle = false;

	/** @type {TimeSeriesData | undefined} */
	export let hoverData = undefined;

	$: cx = hoverData ? $xGet(hoverData) : 0;
	$: cy = hoverData ? $yGet(hoverData) : 0;
	$: lineGen = line(
		(d) => {
			// console.log(d, $xGet(d), $yGet(d));
			return $xGet(d);
		},
		(d) => $yGet(d)
	).defined((d) => $yGet(d) !== null);
	$: path =
		'M' + $data.map((/** @type {number|string} */ d) => `${$xGet(d)},${$yGet(d)}`).join('L');
</script>

<path class="path-line" d={lineGen($data)} {stroke} stroke-width={strokeWidth} />

{#if showCircle && hoverData}
	<circle {cx} {cy} r="6" fill={stroke} />
{/if}

<style>
	.path-line {
		fill: none;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
</style>
