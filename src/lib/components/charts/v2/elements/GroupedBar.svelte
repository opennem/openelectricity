<script>
	/**
	 * GroupedBar Component (v2)
	 *
	 * Renders grouped bar charts where each category has multiple bars
	 * side by side for different series. Uses LayerCake context for
	 * outer scales and creates a local scaleBand for inner series grouping.
	 */
	import { getContext } from 'svelte';
	import { scaleBand } from 'd3-scale';

	const { xScale, yScale, height } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {Array<Record<string, any> & { category: string }>} [dataset] - Array of data rows with a category string and numeric series values
	 * @property {string[]} [seriesNames] - Visible series keys
	 * @property {Record<string, string>} [seriesColours] - Map of series key to colour
	 * @property {string | null} [highlightId] - Currently hovered series key (dims others)
	 * @property {(evt: { data: any, key: string }) => void} [onmousemove] - Callback on bar hover
	 * @property {() => void} [onmouseout] - Callback on bar mouse leave
	 */

	/** @type {Props} */
	let {
		dataset = [],
		seriesNames = [],
		seriesColours = {},
		highlightId = null,
		onmousemove = () => {},
		onmouseout = () => {}
	} = $props();

	let bandwidth = $derived($xScale.bandwidth ? $xScale.bandwidth() : 0);
</script>

<g class="grouped-bar" role="group">
	{#each dataset as row, i (i)}
		{@const label = row.category ?? row._xLabel}
		{@const presentKeys = seriesNames.filter((k) => row[k] != null)}
		{@const rowScale = scaleBand()
			.domain(presentKeys)
			.range([0, bandwidth])
			.paddingInner(0.05)}
		{#each presentKeys as key (key)}
			{@const value = row[key]}
			{@const x = ($xScale(label) ?? 0) + (rowScale(key) ?? 0)}
			{@const y = Math.min($yScale(0), $yScale(value))}
			{@const barHeight = Math.abs($yScale(0) - $yScale(value))}
			<rect
				{x}
				y={y}
				width={rowScale.bandwidth()}
				height={barHeight}
				fill={seriesColours[key] || '#999'}
				opacity={highlightId && highlightId !== key ? 0.3 : 1}
				class="transition-opacity duration-150"
				role="presentation"
				onmouseenter={() => onmousemove({ data: row, key })}
				onmouseleave={onmouseout}
			/>
		{/each}
	{/each}
</g>
