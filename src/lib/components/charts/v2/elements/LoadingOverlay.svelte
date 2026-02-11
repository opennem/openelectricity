<script>
	/**
	 * LoadingOverlay Element
	 *
	 * Renders semi-transparent shimmer rectangles over time ranges that are
	 * currently being fetched. Sits inside a LayerCake chart SVG layer.
	 */
	import { getContext } from 'svelte';

	const { xScale, height } = getContext('LayerCake');

	/**
	 * @typedef {Object} LoadingRange
	 * @property {number} start - Start timestamp
	 * @property {number} end - End timestamp
	 */

	/**
	 * @typedef {Object} Props
	 * @property {LoadingRange[]} [loadingRanges] - Timestamp ranges currently being loaded
	 */

	/** @type {Props} */
	let { loadingRanges = [] } = $props();

	/**
	 * Compute positioned rects from loading ranges
	 * @type {Array<{x: number, width: number}>}
	 */
	let rects = $derived(
		loadingRanges.map((range) => {
			const x1 = $xScale(range.start);
			const x2 = $xScale(range.end);
			return {
				x: Math.min(x1, x2),
				width: Math.abs(x2 - x1)
			};
		})
	);
</script>

<g class="loading-overlay" pointer-events="none">
	{#each rects as rect, i (i)}
		<rect
			class="loading-shimmer"
			x={rect.x}
			y={0}
			width={rect.width}
			height={$height}
			fill="rgba(200,200,200,0.3)"
		/>
	{/each}
</g>

<style>
	.loading-shimmer {
		animation: shimmer-pulse 1.5s ease-in-out infinite;
	}

	@keyframes shimmer-pulse {
		0%,
		100% {
			opacity: 0.15;
		}
		50% {
			opacity: 0.35;
		}
	}
</style>
