<!--
  @component
  Generates an SVG column chart.
 -->
<script>
	import { getContext } from 'svelte';

	const { data, xGet, yGet, x, yRange, xScale, y, height } = getContext('LayerCake');

	/** @type {string} [fill='#00e047'] - The shape's fill colour. */
	export let fill = '#00e047';

	/** @type {string} [stroke='#000'] - The shape's stroke colour. */
	export let stroke = '#000';

	/** @type {number} [strokeWidth=0] - The shape's stroke width. */
	export let strokeWidth = 0;

	/** @type {boolean} [false] - Show the numbers for each column */
	export let showLabels = false;

	$: columnWidth = (/** @type {*} */ d) => {
		const vals = $xGet(d);
		return Math.abs(vals[1] - vals[0]);
	};

	$: columnHeight = (/** @type {*} */ d) => {
		return $yRange[0] - $yGet(d);
	};
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
