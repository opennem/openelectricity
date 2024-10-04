<script>
	import { getContext } from 'svelte';

	const { width, height, padding } = getContext('LayerCake');

	export let id = 'clipping-path';
	/** @type {number|null} */
	export let customPaddingLeft = null;
	/** @type {number|null} */
	export let customPaddingRight = null;

	$: left = customPaddingLeft || customPaddingLeft === 0 ? customPaddingLeft : $padding.left;
	$: right = customPaddingRight || customPaddingRight === 0 ? customPaddingRight : $padding.right;
</script>

<clipPath {id} transform="translate({-left}, 0)">
	<rect
		width={$width + left + right}
		height={$height + $padding.top + $padding.bottom}
		fill="transparent"
	/>
</clipPath>
