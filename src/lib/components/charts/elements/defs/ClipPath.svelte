<script>
	import { getContext } from 'svelte';

	const { width, height, padding } = getContext('LayerCake');

	
	
	/**
	 * @typedef {Object} Props
	 * @property {string} [id]
	 * @property {number|null} [customPaddingLeft]
	 * @property {number|null} [customPaddingRight]
	 */

	/** @type {Props} */
	let { id = 'clipping-path', customPaddingLeft = null, customPaddingRight = null } = $props();

	let left = $derived(customPaddingLeft || customPaddingLeft === 0 ? customPaddingLeft : $padding.left);
	let right = $derived(customPaddingRight || customPaddingRight === 0 ? customPaddingRight : $padding.right);
</script>

<clipPath {id} transform="translate({-left}, 0)">
	<rect
		width={$width + left + right}
		height={$height + $padding.top + $padding.bottom}
		fill="transparent"
	/>
</clipPath>
