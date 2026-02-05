<script>
	/**
	 * CategoryLine Component
	 *
	 * Renders a line overlay on category charts (e.g., net totals, targets, thresholds).
	 * Takes its own data prop for drawing lines independent of the stacked chart data.
	 * Uses stepAfter curve by default to match stacked area visual style.
	 */
	import { getContext } from 'svelte';
	import { line, curveStepAfter } from 'd3-shape';

	const { xScale, yScale, width } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {any[]} data - Data points with _bandX and value
	 * @property {string} valueKey - Key for the y value
	 * @property {string} [stroke] - Line stroke color
	 * @property {string} [strokeWidth] - Line stroke width
	 * @property {any} [curveType] - D3 curve type
	 */

	/** @type {Props} */
	let {
		data = [],
		valueKey = 'value',
		stroke = '#333',
		strokeWidth = '2',
		curveType = curveStepAfter
	} = $props();

	// Convert band position (0-100) to pixel position
	let chartWidth = $derived($width || 1);

	// Line generator using pixel coordinates
	let linePath = $derived.by(() => {
		if (!data.length || !$yScale) return '';

		const lineGen = line()
			.x((/** @type {any} */ d) => (d._bandX / 100) * chartWidth)
			.y((/** @type {any} */ d) => $yScale(d[valueKey]))
			.curve(curveType)
			.defined((/** @type {any} */ d) => d[valueKey] !== null && d[valueKey] !== undefined && !isNaN(d[valueKey]));

		return lineGen(/** @type {any} */ (data)) || '';
	});
</script>

{#if linePath}
	<path
		class="category-line"
		d={linePath}
		fill="none"
		{stroke}
		stroke-width={strokeWidth}
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
{/if}
