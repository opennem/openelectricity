<script>
	import { getContext } from 'svelte';
	const { width, height, padding, xScale } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {string} [id]
	 * @property {Date[]} domain
	 */

	/** @type {Props} */
	let { id = 'clipping-path', domain } = $props();
	let w = $derived(
		domain ? $xScale(domain[1]) - $xScale(domain[0]) : $width + $padding.left + $padding.right
	);
	let h = $derived($height + $padding.top + $padding.bottom);
	let x = $derived(domain ? $xScale(domain[0]) : 0);
</script>

<clipPath {id} transform="translate({-$padding.left}, 0)">
	<rect {x} width={w} height={h} fill="transparent" />
</clipPath>
