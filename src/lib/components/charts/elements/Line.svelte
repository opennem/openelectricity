<script>
	import { getContext } from 'svelte';
	import { line, curveLinear } from 'd3-shape';

	const { data, xGet, yGet } = getContext('LayerCake');

	/** @type {string} shape's fill colour */
	export let stroke = '#ababab';

	export let strokeWidth = '2px';

	export let showCircle = false;

	export let showDots = false;

	export let curveType = curveLinear;

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
	)
		.curve(curveType)
		.defined((d) => $yGet(d) !== null);
	$: path =
		'M' + $data.map((/** @type {number|string} */ d) => `${$xGet(d)},${$yGet(d)}`).join('L');
</script>

<path class="path-line" d={lineGen($data)} {stroke} stroke-width={strokeWidth} />

{#if showCircle && hoverData}
	<circle {cx} {cy} r="10" fill={stroke} />
{/if}

{#if showDots}
	{#each $data as d}
		<circle cx={$xGet(d)} cy={$yGet(d)} r="3" fill={stroke} fill-opacity="0.3" />
	{/each}
{/if}

<style>
	.path-line {
		fill: none;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
</style>
