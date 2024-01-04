<script>
	import { getContext } from 'svelte';
	import { closestTo } from 'date-fns';

	import { format } from 'd3-format';

	const { data, flatData, xGet, yGet, width, height, xScale, yScale, config } =
		getContext('LayerCake');

	export let dataset = undefined;

	let visible = false;
	let x = 0;
	let y = [0, 0];
	let useDataHeight = false;

	$: console.log('hover', $width);

	$: compareDates = [...new Set($flatData.map((d) => d.data.date))];

	function findItem(evt) {
		const xLayerKey = `layerX`;
		const yLayerKey = `layerY`;

		//     const result = closestTo(dateToCompare, [
		//   new Date(2000, 0, 1),
		//   new Date(2030, 0, 1)
		// ])

		const xInvert = $xScale.invert(evt[xLayerKey]);
		const closest = closestTo(new Date(xInvert), compareDates);
		const data = { date: closest };
		const found = dataset.find((d) => d.time === closest.getTime());

		console.log('flatdata', dataset, found);

		x = $xGet({ data });
		if (found._max && found._min) {
			useDataHeight = true;
			y = $yGet([found._max, found._min]);
		} else {
			useDataHeight = false;
		}
		console.log('xy', x, y, closest);

		// let found = finder.find(evt[xLayerKey], evt[yLayerKey], undefined) || {};

		// console.log($xGet(evt[xLayerKey]));
	}
</script>

<div
	class="bg"
	role="presentation"
	on:mousemove={findItem}
	on:mouseout={() => (visible = false)}
	on:blur={() => (visible = false)}
/>
{#if useDataHeight}
	<div style="left: {x - 1}px; top:{y[0]}px; height: {y[1] - y[0]}px;" class="line" />
{:else}
	<div style="left: {x - 1}px;" class="line" />
{/if}

<style>
	.bg {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		background-color: rgba(64, 113, 156, 0.1);
	}
	.line {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		width: 2px;
		border-left: 2px dotted #333;
		pointer-events: none;
	}
	.line {
		/* transition: left 50ms linear; */
	}
</style>
