<script>
	/**
	 * PanZoomLayer Component (v2)
	 *
	 * A transparent SVG overlay that captures mouse pan and hover gestures.
	 * Mouse: Cmd/Ctrl+drag to pan, hover for tooltip, click to focus.
	 * Touch interactions are handled at the container div level (FacilityChart)
	 * to avoid SVG stacking issues with multi-touch.
	 */
	import { getContext } from 'svelte';
	import { closestTo } from 'date-fns';

	const { xScale, width, height } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {any[]} [dataset] - Array of chart data points (for coordinate math)
	 * @property {(() => void) | undefined} [onpanstart] - Called when pan starts
	 * @property {((deltaMs: number) => void) | undefined} [onpan] - Called during pan with time delta
	 * @property {(() => void) | undefined} [onpanend] - Called when pan ends
	 * @property {boolean} [enabled] - Whether pan interaction is enabled
	 * @property {number} [extraHeight] - Extra height below chart area (e.g. to cover X axis)
	 * @property {[number, number] | null} [viewDomain] - Explicit time domain [startMs, endMs] for computing msPerPx
	 * @property {boolean} [stepMode] - Use floor-based band detection for hover (step curves)
	 * @property {(evt: { data: TimeSeriesData, key?: string }) => void} [onmousemove] - Forwarded hover event
	 * @property {(() => void) | undefined} [onmouseout] - Forwarded mouseout
	 * @property {(data: TimeSeriesData) => void} [onpointerup] - Forwarded click with data
	 */

	/** @type {Props} */
	let {
		dataset = [],
		onpanstart,
		onpan,
		onpanend,
		enabled = true,
		extraHeight = 0,
		viewDomain = null,
		stepMode = false,
		onmousemove,
		onmouseout,
		onpointerup
	} = $props();

	let isPanning = $state(false);
	let startX = $state(0);
	let lastX = $state(0);

	/** @type {number | null} */
	let rafId = $state(null);
	let pendingClientX = $state(0);

	/**
	 * Milliseconds-per-pixel ratio, captured at pan start.
	 * Fixed for the entire drag to avoid feedback loops.
	 */
	let msPerPx = $state(0);

	let rectWidth = $derived($width ? Math.abs($width) : 0);
	let rectHeight = $derived($height ? Math.abs($height) : 0);

	const PAN_THRESHOLD = 3;

	/** @type {SVGRectElement | undefined} */
	let rectElement = $state(undefined);

	function processPanFrame() {
		rafId = null;
		const deltaPx = pendingClientX - lastX;
		const deltaMs = deltaPx * msPerPx;
		lastX = pendingClientX;
		onpan?.(deltaMs);
	}

	/**
	 * @param {PointerEvent} event
	 */
	function handlePointerDown(event) {
		if (!enabled) return;
		if (event.pointerType === 'touch') return; // touch handled at container level
		if (event.button !== 0) return;
		if (!event.metaKey && !event.ctrlKey) return;

		startX = event.clientX;
		lastX = event.clientX;
		isPanning = false;

		// Capture ms/px ratio from the current scale
		const rangeSpan = $width;
		if (viewDomain && rangeSpan > 0) {
			msPerPx = (viewDomain[1] - viewDomain[0]) / rangeSpan;
		} else {
			const domain = $xScale.domain();
			if (domain.length === 2 && rangeSpan > 0) {
				const domainMs = domain[1].getTime() - domain[0].getTime();
				msPerPx = domainMs / rangeSpan;
			}
		}

		window.addEventListener('pointermove', handlePointerMove);
		window.addEventListener('pointerup', handlePointerUp);
	}

	/**
	 * @param {PointerEvent} event
	 */
	function handlePointerMove(event) {
		const dx = Math.abs(event.clientX - startX);

		if (!isPanning && dx > PAN_THRESHOLD) {
			isPanning = true;
			onpanstart?.();
		}

		if (!isPanning) return;

		event.preventDefault();
		pendingClientX = event.clientX;

		if (rafId === null) {
			rafId = requestAnimationFrame(processPanFrame);
		}
	}

	/**
	 * @param {PointerEvent} _event
	 */
	function handlePointerUp(_event) {
		window.removeEventListener('pointermove', handlePointerMove);
		window.removeEventListener('pointerup', handlePointerUp);

		if (rafId !== null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}

		if (isPanning) {
			isPanning = false;
			onpanend?.();
		}
	}

	// --- Hover detection ---

	let compareDates = $derived([...new Set(dataset.map((d) => d.date))]);

	/**
	 * Find the closest data point to a mouse event's x position
	 * @param {MouseEvent} evt
	 * @returns {TimeSeriesData | undefined}
	 */
	function findClosestDataPoint(evt) {
		const rect = rectElement?.getBoundingClientRect();
		if (!rect) return undefined;
		const offsetX = evt.clientX - rect.left;
		const xInvert = $xScale.invert(offsetX);

		if (stepMode) {
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
</script>

<rect
	bind:this={rectElement}
	class="pan-zoom-layer"
	class:panning={isPanning}
	width={rectWidth}
	height={rectHeight + extraHeight}
	fill="transparent"
	role="presentation"
	style:pointer-events={enabled ? 'all' : 'none'}
	style:touch-action="none"
	onpointerdown={handlePointerDown}
	onmousemove={(e) => {
		if (isPanning) return;
		const item = findClosestDataPoint(e);
		if (item) onmousemove?.({ data: item });
	}}
	onmouseout={() => !isPanning && onmouseout?.()}
	onpointerup={(e) => {
		if (isPanning) return;
		const item = findClosestDataPoint(e);
		if (item) onpointerup?.(item);
	}}
/>

<style>
	.pan-zoom-layer {
		cursor: default;
	}
	.pan-zoom-layer.panning {
		cursor: grabbing;
	}
	.pan-zoom-layer:focus {
		outline: none;
	}
</style>
