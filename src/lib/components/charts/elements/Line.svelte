<script>
	import { getContext } from 'svelte';
	import { line, curveLinear } from 'd3-shape';

	const { data, xGet, yGet } = getContext('LayerCake');

	/** @type {string} shape's fill colour */
	export let stroke = '#ababab';
	export let strokeArray = 'none';

	export let strokeWidth = '2px';

	export let showCircle = false;

	export let clipPathId = '';
	export let showDots = false;
	export let dotFill = 'none';
	export let dotStroke = '#ababab';
	export let dotOpacity = 0.3;

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
		.defined((d) => $yGet(d) !== null && $yGet(d) !== undefined && !isNaN($yGet(d)));

	$: path =
		'M' + $data.map((/** @type {number|string} */ d) => `${$xGet(d)},${$yGet(d)}`).join('L');
</script>

<g class="line-group" role="group" clip-path={clipPathId ? `url(#${clipPathId})` : ''}>
	<path
		class="path-line"
		d={lineGen($data)}
		{stroke}
		stroke-width={strokeWidth}
		stroke-dasharray={strokeArray}
	/>

	{#if showCircle && hoverData}
		<circle {cx} {cy} r="10" fill={stroke} />
	{/if}

	{#if showDots}
		{#each $data as d}
			<circle
				cx={$xGet(d)}
				cy={$yGet(d)}
				r="3"
				fill={dotFill}
				stroke={dotStroke}
				fill-opacity={dotOpacity}
			/>
		{/each}
	{/if}
</g>

<style>
	.path-line {
		fill: none;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
</style>
