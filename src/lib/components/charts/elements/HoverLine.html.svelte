<script>
	import { run } from 'svelte/legacy';

	import { getContext } from 'svelte';

	const { xGet, yGet, height } = getContext('LayerCake');

	





	/**
	 * @typedef {Object} Props
	 * @property {TimeSeriesData | undefined} [hoverData]
	 * @property {string} [lineColour]
	 * @property {string} [borderStyle]
	 * @property {number} [yTopOffset]
	 * @property {boolean} [isShapeStack]
	 * @property {boolean} [useDataHeight]
	 */

	/** @type {Props} */
	let {
		hoverData = undefined,
		lineColour = '#333',
		borderStyle = 'solid',
		yTopOffset = 0,
		isShapeStack = false,
		useDataHeight = false
	} = $props();

	let visible = $state(false);
	let x = $state(0);
	let y = $state([0, 0]);


	/**
	 * @param {TimeSeriesData | undefined} d
	 */
	function updateLineCoords(d) {
		if (d) {
			const data = { date: d.date };
			x = isShapeStack ? $xGet({ data }) : $xGet(data);
		}

		if (isShapeStack) {
			if (d && d._max !== undefined && d._min !== undefined) {
				y = $yGet([d._max, d._min]);
			}
		} else {
			// make sure the line doesn't go off the bottom of the chart
			y = [$yGet(d) + yTopOffset > $height ? $height : $yGet(d) + yTopOffset, $height];
		}
	}
	run(() => {
		if (hoverData) {
			updateLineCoords(hoverData);
			visible = true;
		} else {
			visible = false;
		}
	});
</script>

{#if visible}
	{#if useDataHeight}
		<div
			style="left: {x - 1}px; top: {y[0]}px; height: {y[1] -
				y[0]}px; border-left-color: {lineColour}; border-style: {borderStyle}"
			class="hover-line"
		></div>
	{:else}
		<div
			style="left: {x - 1}px; border-left-color: {lineColour}; border-style: {borderStyle}"
			class="hover-line"
		></div>
	{/if}
{/if}

<style>
	.hover-line {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		pointer-events: none;
	}
	.hover-line {
		width: 1px;
		border-left: 1px solid #333;
	}
</style>
