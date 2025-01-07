<script>
	import { getContext } from 'svelte';

	const { width } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {number} [min]
	 * @property {number} [max]
	 * @property {string} [fill]
	 */

	/** @type {Props} */
	let { min = 0, max = 800, fill = '' } = $props();

	const rectHeight = 10;
</script>

<g>
	<rect x="0" y="0" width={$width} height={rectHeight} {fill} />
	<text class="text-xs" text-anchor="start" x={0} y={rectHeight * 2 + 6}>{min}</text>
	<text class="text-xs" text-anchor="end" x={$width} y={rectHeight * 2 + 6}>{max}</text>
</g>
