/**
 * Generic pan/zoom/tooltip interaction state for Observable Plot time-series charts.
 *
 * Manages viewport, hover, and panning state, and provides handler functions
 * for pointer and wheel events. Data fetching and tooltip data lookup are
 * handled via configurable callbacks, keeping this class data-source agnostic.
 */

export default class PlotInteraction {
	// ── Public reactive state ────────────────────────────────────
	/** @type {number} viewport start in ms */
	viewStart = $state(0);

	/** @type {number} viewport end in ms */
	viewEnd = $state(0);

	/** @type {any} nearest data point at cursor */
	hoverData = $state(null);

	/** @type {number} crosshair x position in px */
	hoverX = $state(0);

	/** @type {number} raw cursor time in ms (for sync) */
	hoverTime = $state(0);

	/** @type {number} end time of step band (next data point's time, 0 if N/A) */
	hoverBandEnd = $state(0);

	/** @type {boolean} */
	isPanning = $state(false);

	// ── Configurable callbacks ───────────────────────────────────
	// Set these after construction once all reactive dependencies are declared.

	/** Called on every viewport change (pan/zoom). Use for data fetching. */
	/** @type {(start: number, end: number) => void} */
	onViewportChange = () => {};

	/** Called when a pan gesture ends. `panDelta` is positive when panning backward in time. */
	/** @type {(panDelta: number) => void} */
	onPanEnd = () => {};

	/** Return the nearest data point for tooltip. Should return `{ data, time, nextTime? }` or null. */
	/** @type {(timeAtCursor: number) => { data: any, time: number, nextTime?: number } | null} */
	findNearest = () => null;

	/** Return current minimum viewport duration in ms. */
	/** @type {() => number} */
	getMinViewport = () => 3_600_000;

	/** Return current maximum viewport duration in ms. */
	/** @type {() => number} */
	getMaxViewport = () => 16 * 86_400_000;

	/** Called when viewport changes (for multi-chart sync). */
	/** @type {((start: number, end: number) => void) | null} */
	onViewportSync = null;

	/** Called when hover updates (for multi-chart sync). Passes the raw time in ms. */
	/** @type {((timeMs: number) => void) | null} */
	onHoverSync = null;

	/** Called when hover clears (for multi-chart sync). */
	/** @type {(() => void) | null} */
	onHoverClear = null;

	// ── Private ──────────────────────────────────────────────────
	/** @type {import('./PlotChartOptions.svelte.js').default} */
	#chartOpts;

	/** @type {{ x: number, startMs: number, endMs: number } | null} */
	#panOrigin = null;

	/** @type {number} */
	#lastPanDelta = 0;

	/**
	 * @param {import('./PlotChartOptions.svelte.js').default} chartOpts
	 */
	constructor(chartOpts) {
		this.#chartOpts = chartOpts;
	}

	/**
	 * Set the viewport programmatically (e.g. from initial data load).
	 * Does NOT trigger onViewportChange.
	 * @param {number} start
	 * @param {number} end
	 */
	setViewport(start, end) {
		this.viewStart = start;
		this.viewEnd = end;
	}

	/**
	 * Set hover from a synced time (another chart's hover).
	 * Looks up own data via findNearest and updates hoverData/hoverX.
	 * @param {number} timeMs
	 * @param {number} containerWidth - needed for pixel calculation
	 */
	setHoverFromSync(timeMs, containerWidth) {
		this.hoverTime = timeMs;
		const result = this.findNearest(timeMs);
		if (result) {
			this.hoverData = result.data;
			const plotWidth = containerWidth - this.#chartOpts.marginLeft - this.#chartOpts.marginRight;
			const nearestRatio = (result.time - this.viewStart) / (this.viewEnd - this.viewStart);
			this.hoverX = this.#chartOpts.marginLeft + nearestRatio * plotWidth;
			this.hoverBandEnd = result.nextTime ?? 0;
		} else {
			this.hoverData = null;
			this.hoverBandEnd = 0;
		}
	}

	// ── Helpers ──────────────────────────────────────────────────

	/** @param {{ width: number }} rect */
	#getPlotWidth(rect) {
		return rect.width - this.#chartOpts.marginLeft - this.#chartOpts.marginRight;
	}

	/**
	 * @param {number} start
	 * @param {number} end
	 */
	#clampToNow(start, end) {
		const now = Date.now();
		if (end > now) {
			return { start: now - (end - start), end: now };
		}
		return { start, end };
	}

	/** @param {PointerEvent} event */
	#updateTooltip(event) {
		const el = /** @type {HTMLElement} */ (event.currentTarget);
		const rect = el.getBoundingClientRect();
		const plotWidth = this.#getPlotWidth(rect);
		const relX = event.clientX - rect.left - this.#chartOpts.marginLeft;
		const ratio = Math.max(0, Math.min(1, relX / plotWidth));
		const timeAtCursor = this.viewStart + ratio * (this.viewEnd - this.viewStart);

		const result = this.findNearest(timeAtCursor);
		if (result) {
			this.hoverData = result.data;
			this.hoverTime = result.time;
			this.hoverBandEnd = result.nextTime ?? 0;
			const nearestRatio = (result.time - this.viewStart) / (this.viewEnd - this.viewStart);
			this.hoverX = this.#chartOpts.marginLeft + nearestRatio * plotWidth;

			this.onHoverSync?.(result.time);
		}
	}

	// ── Event handlers (arrow functions for stable `this`) ───────

	/** @param {PointerEvent} event */
	handlePointerDown = (event) => {
		this.#panOrigin = { x: event.clientX, startMs: this.viewStart, endMs: this.viewEnd };
		this.isPanning = true;
		this.hoverData = null;
		this.hoverBandEnd = 0;
		/** @type {HTMLElement} */ (event.currentTarget).setPointerCapture(event.pointerId);
	};

	/** @param {PointerEvent} event */
	handlePointerMove = (event) => {
		if (!this.#panOrigin) {
			this.#updateTooltip(event);
			return;
		}

		const rect = /** @type {HTMLElement} */ (event.currentTarget).getBoundingClientRect();
		const plotWidth = this.#getPlotWidth(rect);
		const dx = event.clientX - this.#panOrigin.x;
		const msPerPx = (this.#panOrigin.endMs - this.#panOrigin.startMs) / plotWidth;
		const deltaMs = dx * msPerPx;

		let newStart = this.#panOrigin.startMs - deltaMs;
		let newEnd = this.#panOrigin.endMs - deltaMs;

		const clamped = this.#clampToNow(newStart, newEnd);
		this.viewStart = clamped.start;
		this.viewEnd = clamped.end;
		this.#lastPanDelta = deltaMs;

		this.onViewportChange(this.viewStart, this.viewEnd);
		this.onViewportSync?.(this.viewStart, this.viewEnd);
	};

	handlePointerUp = () => {
		const delta = this.#lastPanDelta;
		this.#panOrigin = null;
		this.isPanning = false;
		this.onPanEnd(delta);
	};

	handlePointerLeave = () => {
		if (!this.#panOrigin) {
			this.hoverData = null;
			this.hoverBandEnd = 0;
			this.onHoverClear?.();
		}
	};

	/** @param {WheelEvent} event */
	handleWheel = (event) => {
		event.preventDefault();

		// Clear hover during zoom
		this.hoverData = null;
		this.hoverBandEnd = 0;
		this.onHoverClear?.();

		const factor = Math.pow(1.002, -event.deltaY);
		const rect = /** @type {HTMLElement} */ (event.currentTarget).getBoundingClientRect();
		const plotWidth = this.#getPlotWidth(rect);
		const relX = event.clientX - rect.left - this.#chartOpts.marginLeft;
		const ratio = Math.max(0, Math.min(1, relX / plotWidth));
		const centerMs = this.viewStart + ratio * (this.viewEnd - this.viewStart);

		const duration = this.viewEnd - this.viewStart;
		const newDuration = Math.min(
			Math.max(duration / factor, this.getMinViewport()),
			this.getMaxViewport()
		);

		let newStart = centerMs - ratio * newDuration;
		let newEnd = newStart + newDuration;

		const clamped = this.#clampToNow(newStart, newEnd);
		this.viewStart = clamped.start;
		this.viewEnd = clamped.end;

		this.onViewportChange(this.viewStart, this.viewEnd);
		this.onViewportSync?.(this.viewStart, this.viewEnd);
	};

	/**
	 * Svelte action — bind to the chart container to register the wheel listener
	 * with `{ passive: false }` (required for preventDefault).
	 *
	 * Usage: `<div use:interaction.bindWheel>`
	 * @param {HTMLElement} node
	 */
	bindWheel = (node) => {
		const handler = this.handleWheel;
		node.addEventListener('wheel', handler, { passive: false });
		return {
			destroy() {
				node.removeEventListener('wheel', handler);
			}
		};
	};
}
