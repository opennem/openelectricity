<script>
	/**
	 * Line Component (v2)
	 *
	 * Renders a simple line chart path from data points.
	 * Used in DateBrush for the overview visualization.
	 */
	import { getContext } from 'svelte';
	import { line, curveLinear } from 'd3-shape';

	const { data, xGet, yGet } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {string} [stroke] - Line stroke colour
	 * @property {string} [strokeArray] - Dash pattern
	 * @property {string} [strokeWidth] - Line width
	 * @property {string} [clipPathId] - Optional clip path ID
	 * @property {any} [curveType] - D3 curve type
	 * @property {boolean} [showDots] - Show dots at data points
	 * @property {number} [dotRadius] - Dot radius
	 * @property {string} [dotFill] - Dot fill colour
	 * @property {string} [dotStroke] - Dot stroke colour
	 * @property {number} [dotOpacity] - Dot fill opacity
	 */

	/** @type {Props} */
	let {
		stroke = '#ababab',
		strokeArray = 'none',
		strokeWidth = '2px',
		clipPathId = '',
		curveType = curveLinear,
		showDots = false,
		dotRadius = 3,
		dotFill = 'none',
		dotStroke = '#ababab',
		dotOpacity = 0.3
	} = $props();

	// Line generator
	let lineGen = $derived(
		line(
			(d) => $xGet(d),
			(d) => $yGet(d)
		)
			.curve(curveType)
			.defined((d) => {
				const y = $yGet(d);
				return y !== null && y !== undefined && !isNaN(y);
			})
	);
</script>

<g class="line-group" role="group" clip-path={clipPathId ? `url(#${clipPathId})` : ''}>
	<!-- Line path -->
	<path class="line-path" d={lineGen($data)} {stroke} stroke-width={strokeWidth} stroke-dasharray={strokeArray} />

	<!-- Optional dots -->
	{#if showDots}
		{#each $data as d}
			{@const cx = $xGet(d)}
			{@const cy = $yGet(d)}

			{#if cx && cy && !isNaN(cy)}
				<circle
					{cx}
					{cy}
					r={dotRadius}
					fill={dotFill}
					stroke={dotStroke}
					fill-opacity={dotOpacity}
				/>
			{/if}
		{/each}
	{/if}
</g>

<style>
	.line-path {
		fill: none;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
</style>
