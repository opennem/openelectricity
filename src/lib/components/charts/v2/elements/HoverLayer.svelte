<script>
	/**
	 * HoverLayer Component (v2)
	 *
	 * A transparent overlay that captures mouse events across the entire chart area.
	 * Finds the closest data point to the mouse position and emits events.
	 */
	import { getContext } from 'svelte';
	import { closestTo } from 'date-fns';

	const { xScale, width, height } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {TimeSeriesData[]} [dataset] - The dataset to search for closest point
	 * @property {boolean} [stepMode] - Use floor-based band detection (for step curves)
	 * @property {(evt: { data: TimeSeriesData, key?: string }) => void} [onmousemove] - Mouse move callback
	 * @property {() => void} [onmouseout] - Mouse out callback
	 * @property {(data: TimeSeriesData) => void} [onpointerup] - Pointer up (click) callback
	 */

	/** @type {Props} */
	let { dataset = [], stepMode = false, onmousemove, onmouseout, onpointerup } = $props();

	// Extract unique dates for comparison
	let compareDates = $derived([...new Set(dataset.map((d) => d.date))]);

	// Rect dimensions
	let rectHeight = $derived($height ? Math.abs($height) : 0);

	/**
	 * Find the closest data point to the mouse x position
	 * @param {MouseEvent|TouchEvent} evt
	 * @returns {TimeSeriesData | undefined}
	 */
	function findClosestDataPoint(evt) {
		let offsetX = 0;

		if ('offsetX' in evt) {
			offsetX = evt.offsetX;
		} else if ('touches' in evt && evt.touches.length > 0) {
			const rect = /** @type {Element} */ (evt.target).getBoundingClientRect();
			offsetX = evt.touches[0].clientX - rect.left;
		}

		const xInvert = $xScale.invert(offsetX);

		if (stepMode) {
			// Floor-based: find last data point with time <= cursor
			const cursorTime = new Date(xInvert).getTime();
			let found = undefined;
			for (const d of dataset) {
				if (d.time <= cursorTime) {
					found = d;
				} else {
					break;
				}
			}
			return found;
		}

		const closest = closestTo(new Date(xInvert), compareDates);

		if (!closest) return undefined;

		return dataset.find((d) => d.time === closest.getTime());
	}

	/**
	 * Handle pointer move
	 * @param {MouseEvent|TouchEvent} evt
	 */
	function handlePointerMove(evt) {
		const item = findClosestDataPoint(evt);
		if (item) {
			onmousemove?.({ data: item });
		}
	}

	/**
	 * Handle pointer up (click)
	 * @param {MouseEvent|TouchEvent} evt
	 */
	function handlePointerUp(evt) {
		const item = findClosestDataPoint(evt);
		if (item) {
			onpointerup?.(item);
		}
	}

	/**
	 * Handle mouse out
	 */
	function handleMouseOut() {
		onmouseout?.();
	}
</script>

<rect
	class="hover-layer"
	width={$width}
	height={rectHeight}
	fill="transparent"
	role="presentation"
	onmousemove={handlePointerMove}
	onmouseout={handleMouseOut}
	ontouchmove={handlePointerMove}
	onpointerup={handlePointerUp}
	onblur={handleMouseOut}
/>

<style>
	.hover-layer:focus {
		outline: none;
	}
</style>
