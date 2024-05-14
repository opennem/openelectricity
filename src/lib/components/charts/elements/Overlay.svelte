<script>
	import { getContext } from 'svelte';

	const { width, height, padding } = getContext('LayerCake');

	/** @type {string|null} */
	export let fill = '#FAF9F633';
</script>

<g class="overlay pointer-events-none" transform="translate({-$padding.left}, 0)">
	<rect width={$width} height={$height} {fill} />
	<!-- <line x1="0" y1="0" x2="0" y2={$height} stroke-dasharray="2, 2" stroke="black" /> -->
</g>
