<!--
  @component
  Generates an SVG column chart.
 -->
<script>
	import { getContext } from 'svelte';

	const { data, xGet, yGet, x, yRange, xScale, y, height } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {string} [fill]
	 * @property {string} [stroke]
	 * @property {number} [strokeWidth]
	 * @property {boolean} [showLabels]
	 */

	/** @type {Props} */
	let { fill = '#00e047', stroke = '#000', strokeWidth = 0, showLabels = false } = $props();

	let columnWidth = $derived((/** @type {*} */ d) => {
		const vals = $xGet(d);
		return Math.abs(vals[1] - vals[0]);
	});

	let columnHeight = $derived((/** @type {*} */ d) => {
		return $yRange[0] - $yGet(d);
	});
</script>

<g class="column-group">
	{#each $data as d, i}
		{@const colHeight = columnHeight(d)}
		{@const xGot = $xGet(d)}
		{@const xPos = Array.isArray(xGot) ? xGot[0] : xGot}
		{@const colWidth = $xScale.bandwidth ? $xScale.bandwidth() : columnWidth(d)}
		{@const yValue = $y(d)}
		<rect
			class="group-rect"
			data-id={i}
			data-range={$x(d)}
			data-count={yValue}
			x={xPos}
			y={$yGet(d)}
			width={colWidth}
			height={colHeight}
			{fill}
			{stroke}
			stroke-width={strokeWidth}
		/>
		{#if showLabels && yValue}
			<text
				class="text-xs"
				x={xPos + colWidth / 2}
				y={$height - colHeight - 5}
				text-anchor="middle"
			>
				{yValue}
			</text>
		{/if}
	{/each}
</g>
