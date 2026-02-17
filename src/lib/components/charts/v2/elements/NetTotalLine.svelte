<script>
	/**
	 * NetTotalLine Component
	 *
	 * Renders a step-after line for net total values over time-series data.
	 * Must be rendered inside a LayerCake context.
	 */
	import { getContext } from 'svelte';
	import { line, curveStepAfter } from 'd3-shape';

	const { xScale, yScale } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {any[]} dataset - Data points with time and value properties
	 * @property {string} valueKey - Key for the value to plot
	 * @property {string} [stroke] - Line color
	 * @property {number} [strokeWidth] - Line width
	 */

	/** @type {Props} */
	let { dataset = [], valueKey, stroke = '#C74523', strokeWidth = 2 } = $props();

	let path = $derived.by(() => {
		if (!dataset.length || !$xScale || !$yScale) return '';
		const gen = line()
			.x((/** @type {any} */ d) => $xScale(d.time))
			.y((/** @type {any} */ d) => $yScale(d[valueKey]))
			.curve(curveStepAfter);
		return gen(/** @type {any} */ (dataset)) || '';
	});
</script>

{#if path}
	<path d={path} fill="none" {stroke} stroke-width={strokeWidth} pointer-events="none" />
{/if}
