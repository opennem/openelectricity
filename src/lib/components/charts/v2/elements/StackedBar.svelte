<script>
	/**
	 * StackedBar Component (v2)
	 *
	 * Renders stacked bar charts from D3 stack output. Each series is
	 * stacked on top of the previous one using [y0, y1] bounds.
	 * Uses LayerCake context for scales and positioning.
	 */
	import { getContext } from 'svelte';

	const { xScale, yScale } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {Array<Array<[number, number]> & { key: string }>} [stackedData] - D3 stack output: array of series, each with a .key and [y0, y1] elements
	 * @property {Record<string, string>} [seriesColours] - Map of series key to colour
	 * @property {string | null} [highlightId] - Currently hovered series key (dims others)
	 * @property {(evt: { data: any, key: string }) => void} [onmousemove] - Callback on bar hover
	 * @property {() => void} [onmouseout] - Callback on bar mouse leave
	 */

	/** @type {Props} */
	let {
		stackedData = [],
		seriesColours = {},
		highlightId = null,
		onmousemove = () => {},
		onmouseout = () => {}
	} = $props();
</script>

<g class="stacked-bar" role="group">
	{#each stackedData as series (series.key)}
		{#each series as segment, j (j)}
			{@const row = segment.data}
			{@const label = row.category ?? row._xLabel}
			{@const x = $xScale(label) ?? 0}
			{@const y0 = $yScale(segment[0])}
			{@const y1 = $yScale(segment[1])}
			{@const barHeight = y0 - y1}
			{#if barHeight > 0}
				<rect
					{x}
					y={y1}
					width={$xScale.bandwidth ? $xScale.bandwidth() : 0}
					height={barHeight}
					fill={seriesColours[series.key] || '#999'}
					opacity={highlightId && highlightId !== series.key ? 0.3 : 1}
					class="transition-opacity duration-150"
					role="presentation"
					onmouseenter={() => onmousemove({ data: row, key: series.key })}
					onmouseleave={onmouseout}
				/>
			{/if}
		{/each}
	{/each}
</g>
