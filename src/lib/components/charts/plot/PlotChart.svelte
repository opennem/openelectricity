<script>
	import { plotChart } from './plot-action.js';

	/**
	 * @type {{
	 *   options: import('@observablehq/plot').PlotOptions,
	 *   height?: number,
	 *   class?: string
	 * }}
	 */
	let { options, height = 300, class: className = '' } = $props();

	let containerWidth = $state(0);

	let resolvedOptions = $derived({
		...options,
		width: containerWidth || undefined,
		height
	});
</script>

<div bind:clientWidth={containerWidth} class="plot-chart-container {className}">
	{#if containerWidth > 0}
		<div use:plotChart={resolvedOptions}></div>
	{/if}
</div>

<style>
	:global(.plot-chart-container [aria-label="bar"] rect) {
		shape-rendering: crispEdges;
	}
</style>
