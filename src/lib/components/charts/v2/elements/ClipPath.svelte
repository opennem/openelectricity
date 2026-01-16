<script>
	/**
	 * ClipPath Component (v2)
	 *
	 * Creates a clipping path for chart content.
	 * Used to prevent chart elements from rendering outside the chart area.
	 */
	import { getContext } from 'svelte';

	const { width, height, padding } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {string} [id] - Clip path ID (used in clip-path="url(#id)")
	 * @property {number | null} [customPaddingLeft] - Override left padding
	 * @property {number | null} [customPaddingRight] - Override right padding
	 */

	/** @type {Props} */
	let { id = 'clip-path', customPaddingLeft = null, customPaddingRight = null } = $props();

	// Calculate left/right padding (allow 0 as valid value)
	let left = $derived(customPaddingLeft ?? $padding.left);
	let right = $derived(customPaddingRight ?? $padding.right);
</script>

<clipPath {id} transform="translate({-left}, 0)">
	<rect
		width={$width + left + right}
		height={$height + $padding.top + $padding.bottom}
		fill="transparent"
	/>
</clipPath>
