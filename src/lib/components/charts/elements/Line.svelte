<script>
	import { getContext } from 'svelte';
	import { line, curveLinear } from 'd3-shape';

	const { data, xGet, yGet } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {string} [stroke]
	 * @property {string} [strokeArray]
	 * @property {string} [strokeWidth]
	 * @property {boolean} [showCircle]
	 * @property {string} [clipPathId]
	 * @property {boolean} [showLineDots]
	 * @property {string} [dotFill]
	 * @property {string} [dotStroke]
	 * @property {number} [dotOpacity]
	 * @property {number} [dotRadius]
	 * @property {any} [curveType]
	 * @property {TimeSeriesData | undefined} [hoverData]
	 */

	/** @type {Props} */
	let {
		stroke = '#ababab',
		strokeArray = 'none',
		strokeWidth = '2px',
		showCircle = false,
		clipPathId = '',
		showLineDots = false,
		dotFill = 'none',
		dotStroke = '#ababab',
		dotOpacity = 0.3,
		dotRadius = 3,
		curveType = curveLinear,
		hoverData = undefined
	} = $props();

	let cx = $derived(hoverData ? $xGet(hoverData) : 0);
	let cy = $derived(hoverData ? $yGet(hoverData) : 0);
	let lineGen = $derived(
		line(
			(d) => {
				// console.log(d, $xGet(d), $yGet(d));
				return $xGet(d);
			},
			(d) => $yGet(d)
		)
			.curve(curveType)
			.defined((d) => $yGet(d) !== null && $yGet(d) !== undefined && !isNaN($yGet(d)))
	);

	let path = $derived(
		'M' + $data.map((/** @type {number|string} */ d) => `${$xGet(d)},${$yGet(d)}`).join('L')
	);
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

	{#if showLineDots}
		{#each $data as d}
			<circle
				cx={$xGet(d)}
				cy={$yGet(d)}
				r={dotRadius}
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
