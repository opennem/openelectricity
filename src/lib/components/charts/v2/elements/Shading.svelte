<script>
	/**
	 * Shading Element
	 *
	 * Renders shaded rectangular regions on the chart (e.g., nighttime periods).
	 * Expects dataset as array of [startDate, endDate] pairs.
	 */
	import { getContext } from 'svelte';

	const { xGet, height } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {Date[][]} [dataset] - Array of [startDate, endDate] pairs
	 * @property {string} [fill] - Fill color
	 * @property {string} [clipPathId] - Optional clip path ID
	 */

	/** @type {Props} */
	let { dataset = [], fill = '#33333311', clipPathId = '' } = $props();

	/**
	 * Calculate the width of a shading region
	 * @param {Date[]} d - [startDate, endDate] pair
	 */
	function getWidth(d) {
		const x1 = $xGet({ date: d[0] });
		const x2 = $xGet({ date: d[1] });
		return Math.abs(x2 - x1);
	}

	/**
	 * Get the x position for a shading region
	 * @param {Date[]} d - [startDate, endDate] pair
	 */
	function getX(d) {
		return $xGet({ date: d[0] });
	}
</script>

<g class="shading-group">
	{#each dataset as d, i (i)}
		<rect
			class="shading-rect"
			x={getX(d)}
			y={0}
			width={getWidth(d)}
			height={$height}
			{fill}
			clip-path={clipPathId ? `url(#${clipPathId})` : ''}
		/>
	{/each}
</g>
