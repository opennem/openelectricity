<script>
	import { getContext, createEventDispatcher } from 'svelte';
	import { closestTo } from 'date-fns';

	const { xScale, width, height } = getContext('LayerCake');
	const dispatch = createEventDispatcher();

	/** @type {TimeSeriesData[]} */
	export let dataset = [];

	$: compareDates = [...new Set(dataset.map((d) => d.date))];
	$: rectHeight = $height ? Math.abs($height) : 0;

	/**
	 * this function looks for the closest date to the mouse position
	 * and returns the data for that date
	 * @param {MouseEvent|TouchEvent} evt
	 */
	function findItem(evt) {
		let offsetX;
		if (evt.offsetX) {
			offsetX = evt.offsetX;
		} else {
			const rect = evt.target.getBoundingClientRect();
			offsetX = evt.touches[0].clientX - rect.left;
		}

		const xInvert = $xScale.invert(offsetX);
		const closest = closestTo(new Date(xInvert), compareDates);
		const found = dataset.find((d) => d.time === closest?.getTime());
		dispatch('mousemove', found);
	}

	function mouseout() {
		dispatch('mouseout');
	}
</script>

<rect
	width={$width}
	height={rectHeight}
	fill="transparent"
	role="presentation"
	on:mousemove={findItem}
	on:mouseout={mouseout}
	on:touchmove={findItem}
	on:touchend={mouseout}
	on:blur={mouseout}
/>

<style>
	rect:focus {
		outline: none;
	}
</style>
