<script>
	import { getContext } from 'svelte';

	const { width } = getContext('LayerCake');

	export let fill = '';

	const rectHeight = 10;
</script>

<g>
	<rect x="0" y="0" width={$width} height={rectHeight} {fill} />
	<text class="text-xs" text-anchor="start" x={0} y={rectHeight * 2 + 6}>0</text>
	<text class="text-xs" text-anchor="end" x={$width} y={rectHeight * 2 + 6}>800</text>
</g>
