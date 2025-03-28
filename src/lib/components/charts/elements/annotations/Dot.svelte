<script>
	import { getContext } from 'svelte';
	const { padding, xGet, yGet, zGet, yScale, y } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {TimeSeriesData | undefined} [value]
	 * @property {string[]} [domains]
	 * @property {number} [r]
	 * @property {boolean} [isStacked]
	 * @property {string | undefined} [colour]
	 * @property {string | null} [dotBorderColour]
	 */

	/** @type {Props} */
	let {
		value = undefined,
		domains = [],
		r = 5,
		isStacked = false,
		colour,
		dotBorderColour = null
	} = $props();
	let dotRadius = $derived(r - 3);
</script>

<g class="overlay pointer-events-none" transform="translate({-$padding.left}, 0)">
	{#if value}
		{#each domains as domain, i (i)}
			{@const cx = $xGet(value)}
			{@const cy = isStacked ? $yScale(value[domain]) : $yGet({ value: value[domain] })}
			{@const fill = colour ? colour : $zGet({ group: domain })}
			{@const dotBorderFill = dotBorderColour ? dotBorderColour : fill + '66'}
			{#if cx && cy}
				<circle {cx} {cy} {r} fill={dotBorderFill} />
				<circle {cx} {cy} r={dotRadius} {fill} />
			{/if}
		{/each}
	{/if}
</g>
