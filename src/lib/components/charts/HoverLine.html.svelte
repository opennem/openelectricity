<script>
	import { getContext } from 'svelte';

	const { xGet, yGet, height } = getContext('LayerCake');

	/** @type {TimeSeriesData | undefined} */
	export let hoverData = undefined;

	export let lineColour = '#333';

	export let yTopOffset = 0;

	export let isShapeStack = false;

	export let showHoverText = true;

	export let useDataHeight = false;

	/** @type {Function} A function that passes the current value and expects a nicely formatted value in return. */
	export let formatValue = (/** @type {*} */ d) => d;

	let visible = false;
	let x = 0;
	let y = [0, 0];
	let value = 0;

	$: if (hoverData) {
		updateLineCoords(hoverData);
		visible = true;
	} else {
		visible = false;
	}

	/**
	 * @param {TimeSeriesData | undefined} d
	 */
	function updateLineCoords(d) {
		if (d) {
			const data = { date: d.date };
			x = isShapeStack ? $xGet({ data }) : $xGet(data);
			value = d.time;
		} else {
			value = 0;
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
</script>

{#if visible}
	{#if useDataHeight}
		<div
			style="left: {x - 1}px; top: {y[0]}px; height: {y[1] -
				y[0]}px; border-left-color: {lineColour}"
			class="hover-line"
		/>
	{:else}
		<div style="left: {x - 1}px;" class="hover-line" />
	{/if}

	{#if showHoverText}
		<div style="left: {x - 12}px; top: {$height + 5}px" class="hover-text">
			{formatValue(value)}
		</div>
	{/if}
{/if}

<style>
	.hover-line,
	.hover-text {
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
	.hover-text {
		font-size: 10px;
		font-weight: 400;
	}
</style>
