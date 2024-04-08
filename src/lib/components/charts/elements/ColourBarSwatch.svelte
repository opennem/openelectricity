<script>
	import { getContext } from 'svelte';

	const { width } = getContext('LayerCake');

	/** @type {*[]} */
	export let ranges = [];
	/** @type {*[]} */
	export let colours = [];
	/** @type {*[]} */
	export let labels = [];

	const rectHeight = 10;
	$: rectWidth = $width / ranges.length;
</script>

<g>
	<text class="text-sm font-semibold" x="0" y="0">Price</text>
	{#each ranges as range, i}
		<g>
			<rect x={i * rectWidth} y="6" width={rectWidth} height={rectHeight} fill={colours[i]} />
			<text class="text-xs" x={i * rectWidth} y={rectHeight * 2 + 12}>{labels[i]}</text>
		</g>
	{/each}
</g>
