<script>
	import { getContext } from 'svelte';

	const { width, height, padding, xScale } = getContext('LayerCake');

	export let id = 'clipping-path';
	export let domain;

	$: w = domain ? $xScale(domain[1]) - $xScale(domain[0]) : $width + $padding.left + $padding.right;
	$: x = domain ? $xScale(domain[0]) : 0;
</script>

<clipPath {id} transform="translate({-$padding.left}, 0)">
	<rect {x} width={w} height={$height + $padding.top + $padding.bottom} fill="transparent" />
</clipPath>
