<script>
	import { getContext } from 'svelte';

	const { width } = getContext('LayerCake');

	export let fill = '';

	const rectHeight = 10;
</script>

<g>
	<text class="text-sm font-semibold" x="0" y="0">Carbon Intensity</text>
	<g>
		<rect x="0" y="6" width={$width} height={rectHeight} {fill} />
		<text class="text-xs" text-anchor="start" x={0} y={rectHeight * 2 + 12}>0</text>
		<text class="text-xs" text-anchor="end" x={$width} y={rectHeight * 2 + 12}>400</text>
	</g>
</g>
