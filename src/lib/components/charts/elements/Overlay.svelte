<script>
	import { getContext } from 'svelte';

	const { width, height, padding, xGet } = getContext('LayerCake');

	/** @type {string|null} */
	export let fill = '#FAF9F633';

	/** @type {*} */
	export let xStartValue = null;
	/** @type {*} */
	export let xEndValue = null;

	$: xStart = xStartValue ? $xGet({ date: xStartValue }) : xStartValue;
	$: xEnd = xEndValue ? $xGet({ date: xEndValue }) : xEndValue;
	$: rectWidth = xStartValue && xEndValue ? xEnd - xStart : $width;
</script>

<g class="overlay pointer-events-none" transform="translate({-$padding.left}, 0)">
	<rect x={xStart} width={rectWidth} height={$height} {fill} />
</g>
