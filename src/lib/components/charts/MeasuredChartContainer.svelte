<script>
	/**
	 * Chart container that renders its children only once it has real layout,
	 * passing the measured dimensions in.
	 *
	 * LayerCake-style charts default their pre-measurement size (100×100) and
	 * warn — or draw a frame at the wrong size — when mounted before the
	 * browser has laid the container out, which happens whenever a chart
	 * appears late (streamed data, conditional reveal). Deferring the mount
	 * until measurement and seeding the real dimensions avoids the whole
	 * class of problem.
	 *
	 * @typedef {Object} Props
	 * @property {string} [class] sizing classes; the container must get an
	 *   explicit height from here (or an ancestor) or it will never measure
	 * @property {import('svelte').Snippet<[{ width: number, height: number }]>} children
	 */

	/** @type {Props} */
	let { class: className = '', children } = $props();

	let width = $state(0);
	let height = $state(0);

	// One-way latch: a zero-size blip after first mount (hidden ancestor,
	// layout transition) should re-measure, not tear down and rebuild the
	// chart subtree.
	let hasLayout = $state(false);

	$effect(() => {
		if (width && height) hasLayout = true;
	});
</script>

<div class={className} bind:clientWidth={width} bind:clientHeight={height}>
	{#if hasLayout}
		{@render children({ width, height })}
	{/if}
</div>

<style>
	div {
		width: 100%;
	}
</style>
