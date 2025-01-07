<script>
	import { getContext } from 'svelte';

	const { width, height, padding, xGet } = getContext('LayerCake');

	

	
	
	/**
	 * @typedef {Object} Props
	 * @property {string|null} [fill]
	 * @property {*} [xStartValue]
	 * @property {*} [xEndValue]
	 */

	/** @type {Props} */
	let { fill = '#FAF9F633', xStartValue = null, xEndValue = null } = $props();

	let xStart = $derived(xStartValue ? $xGet({ date: xStartValue }) : xStartValue);
	let xEnd = $derived(xEndValue ? $xGet({ date: xEndValue }) : xEndValue);
	let rectWidth = $derived(xStartValue && xEndValue ? xEnd - xStart : $width);
</script>

<g class="overlay pointer-events-none" transform="translate({-$padding.left}, 0)">
	<rect x={xStart} width={rectWidth} height={$height} {fill} />
</g>
