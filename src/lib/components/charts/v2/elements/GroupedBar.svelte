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

	/** Inner scale for positioning series bars within each category band */
	let innerScale = $derived(
		scaleBand()
			.domain(seriesNames)
			.range([0, $xScale.bandwidth ? $xScale.bandwidth() : 0])
			.paddingInner(0.05)
	);
</script>

<g class="grouped-bar" role="group">
	{#each dataset as row, i (i)}
		{#each seriesNames as key (key)}
			{@const value = row[key]}
			{#if value != null}
				{@const x = ($xScale(row.category) ?? 0) + (innerScale(key) ?? 0)}
				{@const barHeight = $height - $yScale(value)}
				<rect
					{x}
					y={$yScale(value)}
					width={innerScale.bandwidth()}
					height={Math.max(0, barHeight)}
					fill={seriesColours[key] || '#999'}
					opacity={highlightId && highlightId !== key ? 0.3 : 1}
					class="transition-opacity duration-150"
					role="presentation"
					onmouseenter={() => onmousemove({ data: row, key })}
					onmouseleave={onmouseout}
				/>
			{/if}
		{/each}
	{/each}
</g>
