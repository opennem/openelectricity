<script>
	import { getContext } from 'svelte';

	const { width, height, padding } = getContext('LayerCake');

	export let id = 'clipping-path';
</script>

<clipPath {id} transform="translate({-$padding.left}, 0)">
	<rect
		width={$width + $padding.left + $padding.right}
		height={$height + $padding.top + $padding.bottom}
		fill="transparent"
	/>
</clipPath>
