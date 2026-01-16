<script>
	/**
	 * Dot Component (v2)
	 *
	 * Renders dots at data points for multiple series.
	 * Used for hover/focus indicators on stacked charts.
	 */
	import { getContext } from 'svelte';

	const { padding, xGet, yGet, zGet, yScale } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {TimeSeriesData | undefined} [value] - Data point to render dots for
	 * @property {string[]} [domains] - Series keys to render dots for
	 * @property {number} [r] - Outer dot radius
	 * @property {boolean} [isStacked] - Whether chart is stacked (affects y position)
	 * @property {string | undefined} [colour] - Override colour for all dots
	 * @property {string | null} [borderColour] - Override border colour
	 */

	/** @type {Props} */
	let {
		value = undefined,
		domains = [],
		r = 5,
		isStacked = false,
		colour = undefined,
		borderColour = null
	} = $props();

	// Inner dot radius
	let innerRadius = $derived(Math.max(r - 3, 1));
</script>

<g class="indicator-dots pointer-events-none" transform="translate({-$padding.left}, 0)">
	{#if value}
		{#each domains as domain, i (i)}
			{@const cx = $xGet(value)}
			{@const cy = isStacked ? $yScale(value[domain]) : $yGet({ value: value[domain] })}
			{@const fill = colour ?? $zGet({ group: domain })}
			{@const border = borderColour ?? fill + '66'}

			{#if cx && cy && !isNaN(cy)}
				<!-- Outer dot (border) -->
				<circle {cx} {cy} {r} fill={border} />
				<!-- Inner dot -->
				<circle {cx} {cy} r={innerRadius} {fill} />
			{/if}
		{/each}
	{/if}
</g>
