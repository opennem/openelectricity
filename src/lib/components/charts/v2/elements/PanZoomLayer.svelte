<script>
	/**
	 * PanZoomLayer Component (v2)
	 *
	 * A transparent SVG overlay that captures pan gestures on the chart.
	 * Sits alongside HoverLayer in a LayerCake chart. Translates pointer
	 * drag movements into time-domain deltas via xScale.invert().
	 *
	 * Uses requestAnimationFrame throttling for smooth panning and attaches
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
	 * @property {boolean} [enabled] - Whether pan interaction is enabled
	 */

	/** @type {Props} */
	let { dataset = [], onpanstart, onpan, onpanend, enabled = true } = $props();

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

	/** @type {SVGRectElement | undefined} */
	let rectElement = $state(undefined);

	/**
	 * Handle pointer down — record start position, capture scale ratio,
	 * and attach window listeners.
	 * @param {PointerEvent} event
	 */
	function handlePointerDown(event) {
		if (!enabled) return;
		if (event.button !== 0) return; // only primary button

		startX = event.clientX;
		lastX = event.clientX;
		isPanning = false;

		// Capture ms/px ratio from the current scale so it stays
		// constant for the entire drag gesture
		const domain = $xScale.domain();
		const rangeSpan = $width;
		if (domain.length === 2 && rangeSpan > 0) {
			const domainMs = domain[1].getTime() - domain[0].getTime();
			msPerPx = domainMs / rangeSpan;
		}

		window.addEventListener('pointermove', handleWindowPointerMove);
		window.addEventListener('pointerup', handleWindowPointerUp);
	}

	/**
	 * Handle pointer move on window during a potential pan.
	 * @param {PointerEvent} event
	 */
	function handleWindowPointerMove(event) {
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
	 * @param {PointerEvent} _event
	 */
	function handleWindowPointerUp(_event) {
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
</script>

<rect
	bind:this={rectElement}
	class="pan-zoom-layer"
	class:panning={isPanning}
	width={rectWidth}
	height={rectHeight}
	fill="transparent"
	role="presentation"
	style:pointer-events={enabled ? 'all' : 'none'}
	onpointerdown={handlePointerDown}
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
