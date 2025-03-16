<script>
	import { getContext } from 'svelte';
	const { padding, xGet, yGet, height, width } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {string} [strokeArray]
	 * @property {string} [strokeColour]
	 * @property {{date: Date} | undefined} [xValue]
	 * @property {*} [yValue]
	 */

	/** @type {Props} */
	let {
		strokeArray = '2, 2',
		strokeColour = 'black',
		xValue = undefined,
		yValue = undefined
	} = $props();

	let x = $state(0);
	let y = $state(0);
	$effect(() => {
		if (xValue) {
			x = $xGet(xValue);
		}
	});
	$effect(() => {
		if (yValue) {
			console.log(yValue, $yGet(yValue));
			y = $yGet(yValue);
		}
	});
</script>

<g class="overlay pointer-events-none" transform="translate({-$padding.left}, 0)">
	{#if xValue}
		<line x1={x} y1="0" x2={x} y2={$height} stroke-dasharray={strokeArray} stroke={strokeColour} />
	{/if}
	{#if yValue}
		<line x1="0" y1={y} x2={$width} y2={y} stroke-dasharray={strokeArray} stroke={strokeColour} />
	{/if}
</g>
