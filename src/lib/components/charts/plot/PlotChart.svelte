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

<div bind:clientWidth={containerWidth} class={className}>
	{#if containerWidth > 0}
		<div use:plotChart={resolvedOptions}></div>
	{/if}
</div>
