<script>
	/**
	 * CategoryOverlay Component
	 *
	 * Renders a rectangular overlay on category charts (e.g., for projections, forecasts).
	 * Uses the band scale from LayerCake context to position the overlay.
	 */
	import { getContext } from 'svelte';

	const { width, height, custom } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {string} [fill] - Fill color or pattern URL
	 * @property {*} [xStartValue] - Start category value (overlay starts here)
	 * @property {*} [xEndValue] - End category value (overlay ends here, defaults to chart end)
	 */

	/** @type {Props} */
	let { fill = 'rgba(0,0,0,0.1)', xStartValue = null, xEndValue = null } = $props();

	// Get the band scale from custom context
	let bandScale = $derived($custom?.bandScale);
	let categories = $derived($custom?.categories || []);

	// Calculate x position and width based on band scale
	let xStart = $derived.by(() => {
		if (!bandScale || xStartValue === null) return 0;
		const pos = bandScale(xStartValue);
		return pos !== undefined ? (pos / 100) * $width : 0;
	});

	let xEnd = $derived.by(() => {
		if (!bandScale) return $width;
		if (xEndValue === null) return $width;
		const pos = bandScale(xEndValue);
		if (pos === undefined) return $width;
		// Add bandwidth to get the end of the category
		return ((pos + bandScale.bandwidth()) / 100) * $width;
	});

	let rectWidth = $derived(xEnd - xStart);
</script>

{#if rectWidth > 0}
	<g class="category-overlay pointer-events-none">
		<rect x={xStart} width={rectWidth} height={$height} {fill} />
	</g>
{/if}
