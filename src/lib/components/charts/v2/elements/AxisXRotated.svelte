<script>
	/**
	 * AxisXRotated Component (v2)
	 *
	 * Renders rotated X-axis labels for categorical (band scale) charts.
	 * Labels are rotated -45 degrees for better readability with long category names.
	 * Uses LayerCake context to access xScale and chart dimensions.
	 */
	import { getContext } from 'svelte';

	const { xScale, height, width } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {string[]} categories - Category labels to render along the x-axis
	 * @property {string} [stroke] - Tick mark stroke colour
	 * @property {string} [textClass] - CSS class for label text
	 */

	/** @type {Props} */
	let {
		categories,
		stroke = '#C6C6C6',
		textClass = 'text-xxs font-light fill-mid-warm-grey'
	} = $props();
</script>

<g class="axis x-axis-rotated pointer-events-none">
	<!-- Background rect to cover area below chart -->
	<rect x="0" y={$height + 1} width={$width} height={20} fill="white" />

	{#each categories as cat (cat)}
		{@const xPos = ($xScale(cat) ?? 0) + $xScale.bandwidth() / 2}
		<g transform="translate({xPos}, {$height})">
			<line y1={0} y2={6} {stroke} />
			<text
				transform="rotate(-45)"
				x={0}
				y={16}
				text-anchor="end"
				class={textClass}
			>
				{cat}
			</text>
		</g>
	{/each}
</g>
