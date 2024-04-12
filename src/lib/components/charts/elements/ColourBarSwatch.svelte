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

{#each ranges as range, i}
	<g>
		<rect x={i * rectWidth} y="0" width={rectWidth} height={rectHeight} fill={colours[i]} />
		<text class="text-xxs fill-mid-grey font-light" x={i * rectWidth} y={rectHeight * 2 + 6}>
			{labels[i]}
		</text>
	</g>
{/each}
