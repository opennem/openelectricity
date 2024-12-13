<script>
	import { getContext } from 'svelte';
	const { padding, xGet, yGet, zGet } = getContext('LayerCake');

	/** @type {TimeSeriesData | undefined} */
	export let value = undefined;
	/** @type {string[]} */
	export let domains = [];
	// export let yKey = undefined;
	export let r = 5;
	// $: showCircle = cx !== undefined && cy !== undefined;
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
