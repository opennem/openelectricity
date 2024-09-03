<script>
	import { getContext } from 'svelte';
	const { padding, xGet, yGet } = getContext('LayerCake');

	/** @type {TimeSeriesData | undefined} */
	export let value = undefined;
	export let r = 6;
	export let fill = '#444';
	let cx = 0;
	let cy = 0;
	let showCircle = true;

	$: if (value) {
		cx = $xGet(value);
		cy = $yGet(value);

		if (cx === undefined || cy === undefined) {
			showCircle = false;
		} else {
			showCircle = true;
		}
	}
</script>

<g class="overlay pointer-events-none" transform="translate({-$padding.left}, 0)">
	{#if showCircle}
		<circle {cx} {cy} {r} stroke-width="0.7" stroke="white" {fill} />
	{/if}
</g>
