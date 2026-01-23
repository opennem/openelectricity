<script>
	/**
	 * LineY Component (v2)
	 *
	 * Renders a horizontal reference line at a specified Y value.
	 * Used for capacity/threshold annotations.
	 */
	import { getContext } from 'svelte';

	const { padding, yScale, width } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {number} yValue - Y value for horizontal line
	 * @property {string} [strokeArray] - Dash pattern for line
	 * @property {string} [strokeColour] - Line colour
	 * @property {number} [strokeWidth] - Line width
	 * @property {string} [label] - Optional label for the line
	 * @property {string} [labelPosition] - Label position: 'left' or 'right'
	 */

	/** @type {Props} */
	let {
		yValue,
		strokeArray = '4, 4',
		strokeColour = '#666',
		strokeWidth = 1,
		label = '',
		labelPosition = 'right'
	} = $props();

	// Calculate Y position using the scale
	let yPos = $derived($yScale(yValue));
</script>

<g class="reference-line-y pointer-events-none" transform="translate({-$padding.left}, 0)">
	<line
		class="line-y"
		x1="0"
		y1={yPos}
		x2={$width}
		y2={yPos}
		stroke-dasharray={strokeArray}
		stroke={strokeColour}
		stroke-width={strokeWidth}
	/>

	{#if label}
		<text
			x={labelPosition === 'left' ? 4 : $width - 4}
			y={yPos - 4}
			text-anchor={labelPosition === 'left' ? 'start' : 'end'}
			class="text-[10px] fill-mid-grey"
		>
			{label}
		</text>
	{/if}
</g>
