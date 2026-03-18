<script>
	/**
	 * LineX Component (v2)
	 *
	 * Renders vertical and/or horizontal indicator lines at specified data points.
	 * Used for hover/focus indicators.
	 */
	import { getContext } from 'svelte';

	const { padding, xGet, yGet, yScale, height, width } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {{ date: Date } | undefined} [xValue] - Data point for vertical line
	 * @property {any} [yValue] - Data point for horizontal line
	 * @property {string} [strokeArray] - Dash pattern for lines
	 * @property {string} [strokeColour] - Line colour
	 * @property {number} [strokeWidth] - Line width
	 * @property {number} [maxYValue] - When set, vertical line ends at this y-domain value instead of chart bottom
	 */

	/** @type {Props} */
	let {
		xValue = undefined,
		yValue = undefined,
		strokeArray = '2, 2',
		strokeColour = 'black',
		strokeWidth = 1,
		maxYValue = undefined
	} = $props();

	// Calculate positions reactively
	let xPos = $derived(xValue ? $xGet(xValue) : 0);
	let yPos = $derived(yValue ? $yGet(yValue) : 0);
	let y1Pos = $derived(maxYValue !== undefined ? $yScale(0) : 0);
	let y2Pos = $derived(maxYValue !== undefined ? $yScale(maxYValue) : $height);
</script>

<g class="indicator-lines pointer-events-none" transform="translate({-$padding.left}, 0)">
	<!-- Vertical line at x position -->
	{#if xValue}
		<line
			class="line-x"
			x1={xPos}
			y1={y1Pos}
			x2={xPos}
			y2={y2Pos}
			stroke-dasharray={strokeArray}
			stroke={strokeColour}
			stroke-width={strokeWidth}
		/>
	{/if}

	<!-- Horizontal line at y position -->
	{#if yValue}
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
	{/if}
</g>
