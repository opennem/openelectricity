<!--
  @component
  Generates an SVG bar chart.
 -->
<script>
	import { getContext } from 'svelte';

	const { data, xScale, yScale, xGet } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {number} [value=0] - The value of the bar.
	 * @property {number} [max=0] - The maximum value of the bar.
	 * @property {number} [height=20] - The height of the bar.
	 * @property {string} [fill='#00bbff'] - The shape's fill color. This is technically optional because it comes with a default value but you'll likely want to replace it with your own color.
	 */

	/** @type {Props} */
	let { fill = '#000000', value = 0, max = 0, height = 0 } = $props();
</script>

<g class="bar-group">
	{#if max}
		<rect
			class="group-rect"
			x={$xScale.range()[0]}
			y={0}
			height={height || $yScale.bandwidth()}
			width={$xGet(max)}
			fill={'#00000033'}
			stroke={'#ffffff'}
			stroke-width={1}
		></rect>
	{/if}
	{#if value}
		<rect
			class="group-rect"
			x={$xScale.range()[0]}
			y={0}
			height={height || $yScale.bandwidth()}
			width={$xGet(value)}
			{fill}
			stroke={'#ffffff'}
			stroke-width={1}
		></rect>
	{/if}
</g>
