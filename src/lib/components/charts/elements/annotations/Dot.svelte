<script>
	import { getContext } from 'svelte';
	const { padding, xGet, yGet, zGet } = getContext('LayerCake');

	/** @type {TimeSeriesData | undefined} */
	export let value = undefined;
	export let yKey = undefined;
	export let r = 5;
	export let fill = 'black';

	$: cx = value ? $xGet(value) : undefined;
	$: cy = value && yKey ? $yGet({ value: value[yKey] }) : undefined;
	$: fill = value && yKey ? $zGet({ group: yKey }) : fill;
	$: showCircle = cx !== undefined && cy !== undefined;
</script>

<g class="overlay pointer-events-none" transform="translate({-$padding.left}, 0)">
	{#if showCircle}
		<circle {cx} {cy} {r} {fill} />
	{/if}
</g>
