<script>
	import { getContext } from 'svelte';
	import { closestTo } from 'date-fns';

	const { xGet, yGet, xScale, height } = getContext('LayerCake');

	/** @type {import('$lib/types/chart.types').TimeSeriesData[]} */
	export let dataset = [];

	/** @type {Function} A function that passes the current value and expects a nicely formatted value in return. */
	export let formatValue = (/** @type {*} */ d) => d;

	let visible = false;
	let x = 0;
	let y = [0, 0];
	let useDataHeight = false;
	let value = 0;

	$: compareDates = [...new Set(dataset.map((d) => d.date))];

	/**
	 * this function looks for the closest date to the mouse position
	 * and sets the x and y values for the line
	 * - if the data contains _max and _min values, use those for the y values which is height of the min/max range
	 * - otherwise, the line will be the full height of the chart
	 * @param {MouseEvent} evt
	 */
	function findItem(evt) {
		const xInvert = $xScale.invert(evt.offsetX);
		const closest = closestTo(new Date(xInvert), compareDates);
		const data = { date: closest };
		const found = dataset.find((d) => d.time === closest?.getTime());

		x = $xGet({ data });

		if (found) {
			value = found.time;
		} else {
			value = 0;
		}

		if (found && found._max !== undefined && found._min !== undefined) {
			useDataHeight = true;
			y = $yGet([found._max, found._min]);
		} else {
			useDataHeight = false;
		}

		visible = true;
	}
</script>

<div
	class="absolute top-0 left-0 right-0 bottom-0"
	role="presentation"
	on:mousemove={findItem}
	on:mouseout={() => (visible = false)}
	on:blur={() => (visible = false)}
/>

{#if visible}
	{#if useDataHeight}
		<div style="left: {x - 1}px; top: {y[0]}px; height: {y[1] - y[0]}px;" class="hover-line" />
	{:else}
		<div style="left: {x - 1}px;" class="hover-line" />
	{/if}
	<div style="left: {x - 12}px; top: {$height + 5}px" class="hover-text">{formatValue(value)}</div>
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
