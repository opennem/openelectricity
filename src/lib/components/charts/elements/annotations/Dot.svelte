<script>
	import { getContext } from 'svelte';
	const { padding, xGet, yGet, zGet } = getContext('LayerCake');

	
	
	
	/**
	 * @typedef {Object} Props
	 * @property {TimeSeriesData | undefined} [value]
	 * @property {string[]} [domains]
	 * @property {number} [r] - export let yKey = undefined; - $: showCircle = cx !== undefined && cy !== undefined;
	 */

	/** @type {Props} */
	let { value = undefined, domains = [], r = 5 } = $props();
	
</script>

<g class="overlay pointer-events-none" transform="translate({-$padding.left}, 0)">
	{#if value}
		{#each domains as domain, i (i)}
			{@const cx = $xGet(value)}
			{@const cy = $yGet({ value: value[domain] })}
			{@const fill = $zGet({ group: domain })}
			{#if cx && cy}
				<circle {cx} {cy} {r} {fill} />
			{/if}
		{/each}
	{/if}
</g>
