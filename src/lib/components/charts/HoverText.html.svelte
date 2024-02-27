<script>
	import { getContext } from 'svelte';

	const { xGet, height } = getContext('LayerCake');

	/** @type {TimeSeriesData | undefined} */
	export let hoverData = undefined;

	let x = 0;
</script>

<div class="absolute pointer-events-none" style="left: {x - 12}px; top: {$height + 5}px">text</div>
