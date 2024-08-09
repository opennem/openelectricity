<script>
	import { getContext } from 'svelte';

	const { xGet, yGet } = getContext('LayerCake');

	export let clipPathId = '';

	/** @type {string} shape's fill colour */
	export let fill = '#ababab';

	export let annotateDots = [];
</script>

<g class="overlay pointer-events-none" clip-path={clipPathId ? `url(#${clipPathId})` : ''}>
	{#each annotateDots as d}
		<circle cx={$xGet(d)} cy={$yGet(d)} r="4" {fill} />
	{/each}
</g>
