<script>
	import { getContext } from 'svelte';

	const { width } = getContext('LayerCake');

	
	
	
	/**
	 * @typedef {Object} Props
	 * @property {*[]} [ranges]
	 * @property {*[]} [colours]
	 * @property {*[]} [labels]
	 */

	/** @type {Props} */
	let { ranges = [], colours = [], labels = [] } = $props();

	const rectHeight = 10;
	let rectWidth = $derived($width / ranges.length);
</script>

{#each ranges as range, i}
	<g>
		<rect x={i * rectWidth} y="0" width={rectWidth} height={rectHeight} fill={colours[i]} />
		<text class="text-xxs fill-mid-grey font-light" x={i * rectWidth} y={rectHeight * 2 + 6}>
			{labels[i]}
		</text>
	</g>
{/each}
