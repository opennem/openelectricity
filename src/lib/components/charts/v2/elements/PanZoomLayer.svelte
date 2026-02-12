<script>
	/**
	 * PanZoomLayer Component (v2)
	 *
	 * A transparent SVG overlay that captures pan, wheel-zoom, and pinch-to-zoom
	 * gestures on the chart. Sits alongside HoverLayer in a LayerCake chart.
	 * Translates pointer drag movements into time-domain deltas via xScale.invert().
	 *
	 * Uses requestAnimationFrame throttling for smooth panning/zooming and attaches
	 * move/up listeners to window so dragging outside the chart still works.
	 */
	import { getContext } from 'svelte';

	const { xScale, width, height } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {any[]} [dataset] - Array of chart data points (for coordinate math)
	 * @property {(() => void) | undefined} [onpanstart] - Called when pan starts (suppress tooltip)
	 * @property {((deltaMs: number) => void) | undefined} [onpan] - Called during pan with time delta
	 * @property {(() => void) | undefined} [onpanend] - Called when pan ends (resume tooltip, trigger prefetch)
	 * @property {((factor: number, centerMs: number) => void) | undefined} [onzoom] - Called during zoom with scale factor and center time
	 * @property {boolean} [enabled] - Whether pan interaction is enabled
	 * @property {number} [extraHeight] - Extra height below chart area (e.g. to cover X axis)
	 * @property {[number, number] | null} [viewDomain] - Explicit time domain [startMs, endMs] for computing msPerPx (used by category charts where xScale is not time-based)
	 * @property {((evt: MouseEvent) => void) | undefined} [onmousemove] - Forwarded mousemove (suppressed during pan)
	 * @property {(() => void) | undefined} [onmouseout] - Forwarded mouseout
	 * @property {((evt: PointerEvent) => void) | undefined} [onpointerup] - Forwarded pointerup for clicks (suppressed during pan)
	 */

	/** @type {Props} */
	let { dataset = [], onpanstart, onpan, onpanend, onzoom, enabled = true, extraHeight = 0, viewDomain = null, onmousemove, onmouseout, onpointerup } = $props();

	/** @type {boolean} */
	let isPanning = $state(false);

	/** @type {number} */
	let startX = $state(0);

	/** @type {number} */
	let lastX = $state(0);

	/** @type {number | null} */
	let rafId = $state(null);

	/** @type {number} */
	let pendingClientX = $state(0);

	/**
	 * Milliseconds-per-pixel ratio, captured at pan start.
	 * Using a fixed ratio avoids feedback loops when the xScale
	 * updates mid-drag (which would make invert() give wrong results).
	 * @type {number}
	 */
	let msPerPx = $state(0);

	// --- Wheel zoom state ---

	/** @type {number | null} */
	let zoomRafId = $state(null);

	/** Accumulated zoom factor across wheel events before the rAF fires */
	let pendingZoomFactor = $state(1);

	/** Center time (ms) for the pending zoom */
	let pendingZoomCenterMs = $state(0);

	// --- Pinch-to-zoom state ---

	/**
	 * Active pointers tracked for pinch detection.
	 * @type {Map<number, { clientX: number, clientY: number }>}
	 */
	let activePointers = new Map();

	/** Whether a pinch gesture is currently active */
	let isPinching = $state(false);

	/** Previous distance between two touch points */
	let prevPinchDist = $state(0);

	// Rect dimensions
	let rectWidth = $derived($width ? Math.abs($width) : 0);
	let rectHeight = $derived($height ? Math.abs($height) : 0);

	/** Minimum pixel movement before a drag is considered a pan */
	const PAN_THRESHOLD = 3;

	/**
	 * Process a pan movement during a rAF callback.
	 * Uses the fixed msPerPx ratio captured at pan start.
	 */
	function processPanFrame() {
		rafId = null;

		const currentX = pendingClientX;
		const deltaPx = currentX - lastX;
		const deltaMs = deltaPx * msPerPx;

		lastX = currentX;
		onpan?.(deltaMs);
	}

	/**
	 * Process a zoom during a rAF callback.
	 * Emits the accumulated factor and resets it.
	 */
	function processZoomFrame() {
		zoomRafId = null;

		const factor = pendingZoomFactor;
		const centerMs = pendingZoomCenterMs;

		// Reset accumulated factor for next batch
		pendingZoomFactor = 1;

		onzoom?.(factor, centerMs);
	}

	/** @type {SVGRectElement | undefined} */
	let rectElement = $state(undefined);

	/**
	 * Compute the distance between two pointer positions.
	 * @param {{ clientX: number, clientY: number }} a
	 * @param {{ clientX: number, clientY: number }} b
	 * @returns {number}
	 */
	function pointerDistance(a, b) {
		const dx = a.clientX - b.clientX;
		const dy = a.clientY - b.clientY;
		return Math.sqrt(dx * dx + dy * dy);
	}

	/**
	 * Compute the midpoint clientX between two pointer positions.
	 * @param {{ clientX: number, clientY: number }} a
	 * @param {{ clientX: number, clientY: number }} b
	 * @returns {number}
	 */
	function pointerMidpointX(a, b) {
		return (a.clientX + b.clientX) / 2;
	}

	/**
	 * Handle pointer down — record start position, capture scale ratio,
	 * track pointer for pinch detection, and attach window listeners.
	 * @param {PointerEvent} event
	 */
	function handlePointerDown(event) {
		if (!enabled) return;

		// Track pointer for pinch detection
		activePointers.set(event.pointerId, {
			clientX: event.clientX,
			clientY: event.clientY
		});

		// If two pointers are down, start pinch mode
		if (activePointers.size === 2) {
			isPinching = true;
			isPanning = false;

			const pointers = [...activePointers.values()];
			prevPinchDist = pointerDistance(pointers[0], pointers[1]);

			// Cancel any pending pan rAF
			if (rafId !== null) {
				cancelAnimationFrame(rafId);
				rafId = null;
			}

			return;
		}

		// Single pointer — start pan tracking
		if (event.button !== 0) return; // only primary button

		startX = event.clientX;
		lastX = event.clientX;
		isPanning = false;

		// Capture ms/px ratio from the current scale so it stays
		// constant for the entire drag gesture
		const rangeSpan = $width;
		if (viewDomain && rangeSpan > 0) {
			// Use explicit time domain (for category charts)
			msPerPx = (viewDomain[1] - viewDomain[0]) / rangeSpan;
		} else {
			const domain = $xScale.domain();
			if (domain.length === 2 && rangeSpan > 0) {
				const domainMs = domain[1].getTime() - domain[0].getTime();
				msPerPx = domainMs / rangeSpan;
			}
		}

		window.addEventListener('pointermove', handleWindowPointerMove);
		window.addEventListener('pointerup', handleWindowPointerUp);
	}

	/**
	 * Handle pointer move on window during a potential pan or pinch.
	 * @param {PointerEvent} event
	 */
	function handleWindowPointerMove(event) {
		// Update tracked pointer position
		if (activePointers.has(event.pointerId)) {
			activePointers.set(event.pointerId, {
				clientX: event.clientX,
				clientY: event.clientY
			});
		}

		// Handle pinch-to-zoom when exactly 2 pointers are active
		if (isPinching && activePointers.size === 2) {
			event.preventDefault();

			const pointers = [...activePointers.values()];
			const newDist = pointerDistance(pointers[0], pointers[1]);

			if (prevPinchDist > 0 && newDist > 0) {
				const factor = newDist / prevPinchDist;
				const midX = pointerMidpointX(pointers[0], pointers[1]);

				// Convert midpoint to time-domain center
				if (rectElement) {
					const rect = rectElement.getBoundingClientRect();
					const offsetX = midX - rect.left;
					const centerMs = viewDomain
						? viewDomain[0] + (offsetX / rect.width) * (viewDomain[1] - viewDomain[0])
						: $xScale.invert(offsetX).getTime();

					// Accumulate into zoom rAF
					pendingZoomFactor *= factor;
					pendingZoomCenterMs = centerMs;

					if (zoomRafId === null) {
						zoomRafId = requestAnimationFrame(processZoomFrame);
					}
				}
			}

			prevPinchDist = newDist;
			return;
		}

		// Single-pointer pan logic
		if (isPinching) return; // Don't pan during pinch

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
	 * Handle pointer up on window — clean up and emit panend if was panning.
	 * @param {PointerEvent} event
	 */
	function handleWindowPointerUp(event) {
		// Remove pointer from tracking
		activePointers.delete(event.pointerId);

		// End pinch if we drop below 2 pointers
		if (isPinching && activePointers.size < 2) {
			isPinching = false;
			prevPinchDist = 0;

			if (zoomRafId !== null) {
				cancelAnimationFrame(zoomRafId);
				zoomRafId = null;
			}

			// Reset pending zoom state
			pendingZoomFactor = 1;
		}

		// Only clean up window listeners and emit panend when all pointers are released
		if (activePointers.size === 0) {
			window.removeEventListener('pointermove', handleWindowPointerMove);
			window.removeEventListener('pointerup', handleWindowPointerUp);

			if (rafId !== null) {
				cancelAnimationFrame(rafId);
				rafId = null;
			}

			if (isPanning) {
				isPanning = false;
				onpanend?.();
			}
		}
	}

	// Note: Wheel zoom is handled at the FacilityChart container div level
	// to avoid SVG event propagation issues with stacked LayerCake SVG layers.
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
	onmousemove={(e) => !isPanning && !isPinching && onmousemove?.(e)}
	onmouseout={() => !isPanning && onmouseout?.()}
	onpointerup={(e) => !isPanning && !isPinching && onpointerup?.(e)}
/>

<style>
	.pan-zoom-layer {
		cursor: grab;
	}
	.pan-zoom-layer.panning {
		cursor: grabbing;
	}
	.pan-zoom-layer:focus {
		outline: none;
	}
</style>
