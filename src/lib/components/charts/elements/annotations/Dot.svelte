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
	 */

	/** @type {Props} */
	let { value = undefined, domains = [], r = 5, isStacked = false, colour } = $props();
</script>

<g class="overlay pointer-events-none" transform="translate({-$padding.left}, 0)">
	{#if value}
		{#each domains as domain, i (i)}
			{@const cx = $xGet(value)}
			{@const cy = isStacked ? $yScale(value[domain]) : $yGet({ value: value[domain] })}
			{@const fill = colour ? colour : $zGet({ group: domain })}
			{#if cx && cy}
				<circle {cx} {cy} {r} {fill} />
			{/if}
		{/each}
	{/if}
</g>
