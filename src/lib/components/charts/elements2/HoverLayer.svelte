<script>
	import { createBubbler } from 'svelte/legacy';

	const bubble = createBubbler();
	import { getContext } from 'svelte';
	import { closestTo } from 'date-fns';

	const { xScale, width, height } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {TimeSeriesData[]} [dataset]
	 * @property {(evt: { data: TimeSeriesData, key: string }) => void} [onmousemove]
	 * @property {() => void} [onmouseout]
	 * @property {(evt: TimeSeriesData) => void} [onpointerup]
	 */

	/** @type {Props} */
	let { dataset = [], onmousemove, onmouseout, onpointerup } = $props();

	let compareDates = $derived([...new Set(dataset.map((d) => d.date))]);
	let rectHeight = $derived($height ? Math.abs($height) : 0);

	/**
	 * this function looks for the closest date to the mouse position
	 * and returns the data for that date
	 * @param {MouseEvent|TouchEvent} evt
	 */
	function findItem(evt) {
		let offsetX = 0;
		if (evt.offsetX) {
			offsetX = evt.offsetX;
		} else if (evt.touches) {
			const rect = evt.target.getBoundingClientRect();
			offsetX = evt.touches[0].clientX - rect.left;
		}

		const xInvert = $xScale.invert(offsetX);
		const closest = closestTo(new Date(xInvert), compareDates);
		const found = dataset.find((d) => d.time === closest?.getTime());
		return found;
	}

	/**
	 * @param {MouseEvent|TouchEvent} evt
	 */
	function pointermove(evt) {
		const item = findItem(evt);
		onmousemove?.(item);
	}

	/**
	 * @param {MouseEvent|TouchEvent} evt
	 */
	function pointerup(evt) {
		const item = findItem(evt);
		onpointerup?.(item);
	}

	function mouseout() {
		onmouseout?.();
	}
</script>

<rect
	width={$width}
	height={rectHeight}
	fill="transparent"
	role="presentation"
	onmousemove={pointermove}
	onmouseout={mouseout}
	onmousedown={bubble('mousedown')}
	ontouchmove={pointermove}
	onpointerup={pointerup}
	onblur={mouseout}
/>

<style>
	rect:focus {
		outline: none;
	}
</style>
