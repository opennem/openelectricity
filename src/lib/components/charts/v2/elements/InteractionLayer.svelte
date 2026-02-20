<script>
	/**
	 * InteractionLayer
	 *
	 * Unified interaction handler for chart gestures. Wraps chart content in a
	 * div and handles all pointer interactions at the HTML level, avoiding SVG
	 * layer stacking issues.
	 *
	 * Mouse:  hover, click to focus, Cmd/Ctrl+drag to pan
	 * Touch:  1-finger drag → hover, 1-finger tap → focus,
	 *         2-finger drag → pan, 2-finger pinch → zoom
	 *
	 * Exposes `interactionMode` (bindable) so the parent can suppress
	 * SVG-level interactions (e.g. StackedArea series hover) during pan/zoom.
	 */

	/**
	 * @typedef {Object} Props
	 * @property {import('../ChartStore.svelte.js').default} chart - Chart store for hover/focus state
	 * @property {boolean} [enablePan] - Enable pan/zoom gestures
	 * @property {[number, number] | null} [viewDomain] - Explicit time domain (category charts)
	 * @property {string} [class] - CSS classes for the wrapper div
	 * @property {'none' | 'hover' | 'mouse-pan' | 'touch-pan'} [interactionMode] - Current mode (bindable)
	 * @property {(time: number, key?: string) => void} [onhover]
	 * @property {() => void} [onhoverend]
	 * @property {(time: number) => void} [onfocus]
	 * @property {(() => void)} [onpanstart]
	 * @property {((deltaMs: number) => void)} [onpan]
	 * @property {(() => void)} [onpanend]
	 * @property {((factor: number, centerMs: number) => void)} [onzoom]
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props} */
	let {
		chart,
		enablePan = false,
		viewDomain = null,
		class: className = '',
		interactionMode = $bindable('none'),
		onhover,
		onhoverend,
		onfocus,
		onpanstart,
		onpan,
		onpanend,
		onzoom,
		children
	} = $props();

	/** @type {HTMLDivElement | undefined} */
	let el = $state(undefined);

	/** @type {Map<number, { clientX: number, clientY: number }>} */
	let pointers = new Map();

	// Pan state
	let panLastX = 0;
	let panMsPerPx = 0;
	/** @type {number | null} */
	let panRafId = $state(null);
	let panPendingX = 0;

	// Pinch state
	let pinchPrevDist = 0;
	/** @type {number | null} */
	let pinchRafId = $state(null);
	let pinchPendingFactor = 1;
	let pinchPendingCenterMs = 0;

	// Tap/drag detection
	let tapStartX = 0;
	let tapStartY = 0;
	const TAP_THRESHOLD = 8;
	const PAN_THRESHOLD = 3;

	// ---- Coordinate mapping ----

	function getTimeDomain() {
		if (viewDomain) return viewDomain;
		const xd = chart.xDomain;
		if (xd && xd.length === 2) return [Number(xd[0]), Number(xd[1])];
		// Fall back to data time range
		const data = chart.seriesScaledData;
		if (data?.length >= 2) {
			return [data[0].time, data[data.length - 1].time];
		}
		return null;
	}

	/**
	 * Convert clientX to time, accounting for LayerCake chart padding.
	 * @param {number} clientX
	 * @returns {number}
	 */
	function clientXToTime(clientX) {
		const domain = getTimeDomain();
		if (!domain) return 0;
		const rect = el?.getBoundingClientRect();
		if (!rect || rect.width === 0) return domain[0];

		const pad = chart.chartStyles.chartPadding;
		const drawLeft = rect.left + (pad.left || 0);
		const drawWidth = rect.width - (pad.left || 0) - (pad.right || 0);
		if (drawWidth <= 0) return domain[0];

		const ratio = Math.max(0, Math.min(1, (clientX - drawLeft) / drawWidth));
		return domain[0] + ratio * (domain[1] - domain[0]);
	}

	/**
	 * Snap a raw time to the nearest data point.
	 * Uses floor semantics for step curves, closest-match otherwise.
	 * @param {number} rawTime
	 * @returns {number}
	 */
	function snapTime(rawTime) {
		const data = chart.seriesScaledData;
		if (!data?.length) return rawTime;

		const isStep = chart.chartOptions.selectedCurveType === 'step';

		if (isStep) {
			let found = data[0].time;
			for (const d of data) {
				if (d.time <= rawTime) found = d.time;
				else break;
			}
			return found;
		}

		// Binary search for closest time
		let lo = 0;
		let hi = data.length - 1;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (data[mid].time < rawTime) lo = mid + 1;
			else hi = mid;
		}
		if (lo > 0) {
			const prev = data[lo - 1].time;
			const curr = data[lo].time;
			if (Math.abs(prev - rawTime) < Math.abs(curr - rawTime)) return prev;
		}
		return data[lo].time;
	}

	function captureMsPerPx() {
		const domain = getTimeDomain();
		const rect = el?.getBoundingClientRect();
		if (domain && rect && rect.width > 0) {
			const pad = chart.chartStyles.chartPadding;
			const drawWidth = rect.width - (pad.left || 0) - (pad.right || 0);
			if (drawWidth > 0) {
				panMsPerPx = (domain[1] - domain[0]) / drawWidth;
			}
		}
	}

	/**
	 * @param {{ clientX: number, clientY: number }} a
	 * @param {{ clientX: number, clientY: number }} b
	 * @returns {number}
	 */
	function pinchDistance(a, b) {
		const dx = a.clientX - b.clientX;
		const dy = a.clientY - b.clientY;
		return Math.sqrt(dx * dx + dy * dy);
	}

	// ---- rAF processors ----

	function processPanFrame() {
		panRafId = null;
		const deltaMs = (panPendingX - panLastX) * panMsPerPx;
		panLastX = panPendingX;
		onpan?.(deltaMs);
	}

	function processPinchFrame() {
		pinchRafId = null;
		const factor = pinchPendingFactor;
		const centerMs = pinchPendingCenterMs;
		pinchPendingFactor = 1;
		onzoom?.(factor, centerMs);
	}

	// ---- Pointer handlers ----

	/**
	 * @param {PointerEvent} event
	 */
	function handlePointerDown(event) {
		if (!enablePan) return;

		// --- Touch ---
		if (event.pointerType === 'touch') {
			pointers.set(event.pointerId, {
				clientX: event.clientX,
				clientY: event.clientY
			});

			if (pointers.size === 1) {
				tapStartX = event.clientX;
				tapStartY = event.clientY;
				interactionMode = 'hover';

				window.addEventListener('pointermove', handlePointerMove);
				window.addEventListener('pointerup', handlePointerUp);
				window.addEventListener('pointercancel', handlePointerCancel);
			}

			if (pointers.size === 2) {
				if (interactionMode === 'hover') {
					chart.clearHover();
					onhoverend?.();
				}
				interactionMode = 'touch-pan';
				onpanstart?.();

				const [a, b] = [...pointers.values()];
				pinchPrevDist = pinchDistance(a, b);
				captureMsPerPx();
				panLastX = (a.clientX + b.clientX) / 2;
			}
			return;
		}

		// --- Mouse: Cmd/Ctrl+drag to pan ---
		if (event.button !== 0) return;
		if (!event.metaKey && !event.ctrlKey) return;

		tapStartX = event.clientX;
		panLastX = event.clientX;
		interactionMode = 'none'; // becomes 'mouse-pan' after threshold
		captureMsPerPx();

		window.addEventListener('pointermove', handlePointerMove);
		window.addEventListener('pointerup', handlePointerUp);
	}

	/**
	 * @param {PointerEvent} event
	 */
	function handlePointerMove(event) {
		if (pointers.has(event.pointerId)) {
			pointers.set(event.pointerId, {
				clientX: event.clientX,
				clientY: event.clientY
			});
		}

		// Touch 1-finger hover
		if (interactionMode === 'hover' && pointers.size === 1) {
			const time = snapTime(clientXToTime(event.clientX));
			chart.setHover(time);
			onhover?.(time);
			return;
		}

		// Touch 2-finger pan + pinch
		if (interactionMode === 'touch-pan' && pointers.size === 2) {
			event.preventDefault();
			const [a, b] = [...pointers.values()];

			// Pinch
			const newDist = pinchDistance(a, b);
			if (pinchPrevDist > 0 && newDist > 0) {
				const midX = (a.clientX + b.clientX) / 2;
				pinchPendingFactor *= newDist / pinchPrevDist;
				pinchPendingCenterMs = clientXToTime(midX);
				if (pinchRafId === null) {
					pinchRafId = requestAnimationFrame(processPinchFrame);
				}
			}
			pinchPrevDist = newDist;

			// Pan
			const midX = (a.clientX + b.clientX) / 2;
			panPendingX = midX;
			if (panRafId === null) {
				panRafId = requestAnimationFrame(processPanFrame);
			}
			return;
		}

		// Mouse Cmd+drag pan
		if (event.pointerType !== 'touch') {
			const dx = Math.abs(event.clientX - tapStartX);

			if (interactionMode === 'none' && dx > PAN_THRESHOLD) {
				interactionMode = 'mouse-pan';
				chart.clearHover();
				onpanstart?.();
			}

			if (interactionMode === 'mouse-pan') {
				event.preventDefault();
				panPendingX = event.clientX;
				if (panRafId === null) {
					panRafId = requestAnimationFrame(processPanFrame);
				}
			}
		}
	}

	/**
	 * @param {PointerEvent} event
	 */
	function handlePointerUp(event) {
		// Touch tap detection
		if (interactionMode === 'hover' && pointers.size === 1) {
			const dx = Math.abs(event.clientX - tapStartX);
			const dy = Math.abs(event.clientY - tapStartY);

			if (dx < TAP_THRESHOLD && dy < TAP_THRESHOLD) {
				const time = snapTime(clientXToTime(event.clientX));
				onfocus ? onfocus(time) : chart.toggleFocus(time);
			}

			chart.clearHover();
			onhoverend?.();
		}

		pointers.delete(event.pointerId);

		if (pointers.size === 0) {
			cleanup();
		}
	}

	/**
	 * @param {PointerEvent} event
	 */
	function handlePointerCancel(event) {
		pointers.delete(event.pointerId);
		if (pointers.size === 0) {
			cleanup();
		}
	}

	function cleanup() {
		window.removeEventListener('pointermove', handlePointerMove);
		window.removeEventListener('pointerup', handlePointerUp);
		window.removeEventListener('pointercancel', handlePointerCancel);

		if (panRafId !== null) {
			cancelAnimationFrame(panRafId);
			panRafId = null;
		}
		if (pinchRafId !== null) {
			cancelAnimationFrame(pinchRafId);
			pinchRafId = null;
		}

		if (interactionMode === 'mouse-pan' || interactionMode === 'touch-pan') {
			onpanend?.();
		}

		interactionMode = 'none';
		pinchPrevDist = 0;
		pinchPendingFactor = 1;
		pointers.clear();
	}

	// ---- Mouse hover/click (non-drag) ----

	/**
	 * @param {MouseEvent} event
	 */
	function handleMouseMove(event) {
		if (interactionMode !== 'none') return;
		const time = snapTime(clientXToTime(event.clientX));
		chart.setHover(time);
		onhover?.(time);
	}

	function handleMouseLeave() {
		if (interactionMode !== 'none') return;
		chart.clearHover();
		onhoverend?.();
	}

	/**
	 * @param {MouseEvent} event
	 */
	function handleClick(event) {
		if (interactionMode !== 'none') return;
		// Cmd/Ctrl+click is used for zoom — don't focus
		if (event.metaKey || event.ctrlKey) return;
		// StackedArea handles clicks on SVG paths via onpointerup — skip to avoid double-toggle
		const target = /** @type {Element} */ (event.target);
		if (target.tagName === 'path') return;

		const time = snapTime(clientXToTime(event.clientX));
		onfocus ? onfocus(time) : chart.toggleFocus(time);
	}

	// ---- Lifecycle ----

	$effect(() => {
		const target = el;
		if (!target || !enablePan) return;

		target.addEventListener('pointerdown', handlePointerDown);

		return () => {
			target.removeEventListener('pointerdown', handlePointerDown);
			cleanup();
		};
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={el}
	class={className}
	style:touch-action={enablePan ? 'none' : undefined}
	onmousemove={handleMouseMove}
	onmouseleave={handleMouseLeave}
	onclick={handleClick}
>
	{@render children?.()}
</div>
