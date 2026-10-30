<script>
	/**
	 * InteractionLayer
	 *
	 * Unified interaction handler for chart gestures. Wraps chart content in a
	 * div and handles all pointer interactions at the HTML level, avoiding SVG
	 * layer stacking issues.
	 *
	 * Mouse:  hover, click to focus; once engaged (or 'always'), drag to pan
	 *         and wheel to zoom
	 * Touch:  vertical swipe scrolls the page (`touch-action: pan-y`),
	 *         horizontal drag → hover, tap → focus (see touch-gesture.js);
	 *         2-finger drag → pan, 2-finger pinch → zoom, with no engaging —
	 *         one finger already belongs to scroll, scrub and tap, and the
	 *         site blocks page pinch-zoom, so two fingers are free
	 *
	 * The browser follows each touch with emulated mouse events; those are
	 * skipped so a tap focuses once and leaves no hover behind (and never
	 * engages tap-to-engage pan/zoom, which is a mouse affordance).
	 *
	 * Exposes `interactionMode` (bindable) so the parent can suppress
	 * SVG-level interactions (e.g. StackedArea series hover) during pan/zoom.
	 */

	import {
		classifyWheelIntent,
		wheelPanDeltaMs,
		wheelZoomFactor,
		WHEEL_PAN_IDLE_MS
	} from '../wheel-interaction.js';
	import { classifyTouchDrag, createEmulatedMouseGuard } from './touch-gesture.js';

	/**
	 * @typedef {Object} Props
	 * @property {import('../ChartStore.svelte.js').default} chart - Chart store for hover/focus state
	 * @property {boolean} [enablePan] - Enable pan/zoom gestures
	 * @property {'always' | 'tap-to-engage'} [panZoomMode] - 'always' (default) keeps pan/zoom active whenever `enablePan` is true. 'tap-to-engage' gates pan/zoom behind the bindable `engaged` flag — the first tap engages instead of toggling focus.
	 * @property {boolean} [engaged] - Bindable engagement state for tap-to-engage mode.
	 * @property {boolean} [pointerInside] - Bindable: the pointer is over this plot (hover time can also arrive from a synced peer or a pinned time)
	 * @property {boolean} [engageOnTap] - Whether a tap on an idle tap-to-engage chart engages it (default). Off, the tap reaches `onfocus` instead, and pan/zoom engages only from the toggle or the idle-wheel hint — for a chart whose clicks pick something (a comparison's A and B).
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
	 * @property {(() => void)} [onblockedwheel] - Fired (throttle-free, passive) when a wheel
	 *   gesture lands on a tap-to-engage chart that isn't engaged — the page keeps scrolling,
	 *   but the consumer can surface a "click to enable pan & zoom" hint at the point of intent.
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props} */
	let {
		chart,
		enablePan = false,
		panZoomMode = /** @type {'always' | 'tap-to-engage'} */ ('always'),
		engaged = $bindable(false),
		engageOnTap = true,
		pointerInside = $bindable(false),
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
		onblockedwheel,
		children
	} = $props();

	let effectiveEnablePan = $derived(enablePan && (panZoomMode === 'always' || engaged));

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
	const PAN_THRESHOLD = 3;

	const emulatedMouse = createEmulatedMouseGuard();
	/**
	 * The current touch: a possible tap, a one-finger horizontal scrub, a
	 * two-finger pan/pinch, or 'done' (handed to the page, or a pan's
	 * remaining finger) until every finger lifts.
	 * @type {null | 'pending' | 'scrub' | 'pan' | 'done'}
	 */
	let touchGesture = null;

	// ---- Coordinate mapping ----

	/**
	 * Cached wrapper rect — `getBoundingClientRect()` forces a layout read, too
	 * expensive per mousemove/wheel event. Refreshed on pointer entry/downs,
	 * element resize, and scroll while hovered.
	 * @type {DOMRect | null}
	 */
	let cachedRect = null;

	function refreshRect() {
		cachedRect = el ? el.getBoundingClientRect() : null;
	}

	function getRect() {
		if (!cachedRect || cachedRect.width === 0) refreshRect();
		return cachedRect;
	}

	function getTimeDomain() {
		if (viewDomain) return viewDomain;
		// `renderXDomain` is `xDomain` extended for step mode; using it here
		// keeps pointer→time in sync with the LayerCake `$xScale`.
		const xd = chart.renderXDomain;
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
		const rect = getRect();
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
	 * Uses floor semantics for step curves (curveStepAfter: value at T covers
	 * [T, T+I)), closest-match otherwise.
	 * @param {number} rawTime
	 * @returns {number}
	 */
	function snapTime(rawTime) {
		const data = chart.seriesScaledData;
		if (!data?.length) return rawTime;

		const isStep = chart.chartOptions.curveType === 'step';

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
		const rect = getRect();
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

	// ---- Touch (always on, engaged or not) ----

	/** Two fingers can pan and pinch: the chart pans and someone listens. */
	let touchPanEnabled = $derived(enablePan && Boolean(onpan || onzoom));

	/**
	 * @param {PointerEvent} event
	 */
	function handleTouchDown(event) {
		if (event.pointerType !== 'touch') return;
		refreshRect();
		pointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });

		if (pointers.size === 1) {
			tapStartX = event.clientX;
			tapStartY = event.clientY;
			touchGesture = 'pending';
			window.addEventListener('pointermove', handleTouchMove);
			window.addEventListener('pointerup', handleTouchUp);
			window.addEventListener('pointercancel', handleTouchCancel);
			return;
		}

		if (pointers.size === 2 && touchPanEnabled) {
			endScrub();
			touchGesture = 'pan';
			interactionMode = 'touch-pan';
			onpanstart?.();
			const [a, b] = [...pointers.values()];
			pinchPrevDist = pinchDistance(a, b);
			captureMsPerPx();
			panLastX = (a.clientX + b.clientX) / 2;
		}
	}

	/**
	 * @param {PointerEvent} event
	 */
	function handleTouchMove(event) {
		if (!pointers.has(event.pointerId)) return;
		pointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });

		if (touchGesture === 'pan') {
			if (pointers.size !== 2) return;
			const [a, b] = [...pointers.values()];
			const midX = (a.clientX + b.clientX) / 2;

			const newDist = pinchDistance(a, b);
			if (pinchPrevDist > 0 && newDist > 0) {
				pinchPendingFactor *= newDist / pinchPrevDist;
				pinchPendingCenterMs = clientXToTime(midX);
				pinchRafId ??= requestAnimationFrame(processPinchFrame);
			}
			pinchPrevDist = newDist;

			panPendingX = midX;
			panRafId ??= requestAnimationFrame(processPanFrame);
			return;
		}

		if (pointers.size !== 1) return;
		if (touchGesture === 'pending') {
			const gesture = classifyTouchDrag(event.clientX - tapStartX, event.clientY - tapStartY);
			if (gesture === 'pending') return;
			// A vertical swipe is the page's scroll (the browser cancels it soon).
			if (gesture === 'scroll') {
				touchGesture = 'done';
				return;
			}
			touchGesture = 'scrub';
			interactionMode = 'hover';
			pointerInside = true;
		}
		if (touchGesture !== 'scrub') return;
		const time = snapTime(clientXToTime(event.clientX));
		if (time !== chart.hoverTime) {
			chart.setHover(time);
			onhover?.(time);
		}
	}

	/**
	 * @param {PointerEvent} event
	 */
	function handleTouchUp(event) {
		if (!pointers.has(event.pointerId)) return;
		if (touchGesture === 'pending' && pointers.size === 1) {
			const time = snapTime(clientXToTime(event.clientX));
			onfocus ? onfocus(time) : chart.toggleFocus(time);
		}
		releaseTouch(event.pointerId);
	}

	/**
	 * @param {PointerEvent} event
	 */
	function handleTouchCancel(event) {
		if (pointers.has(event.pointerId)) releaseTouch(event.pointerId);
	}

	/**
	 * A finger lifted or was taken by the browser. Lifting one of two ends the
	 * pan; the other finger does nothing more until every finger is up.
	 * @param {number} pointerId
	 */
	function releaseTouch(pointerId) {
		pointers.delete(pointerId);
		if (touchGesture === 'pan') {
			endPan();
			touchGesture = 'done';
		}
		if (pointers.size === 0) endTouch();
	}

	function endTouch() {
		window.removeEventListener('pointermove', handleTouchMove);
		window.removeEventListener('pointerup', handleTouchUp);
		window.removeEventListener('pointercancel', handleTouchCancel);
		emulatedMouse.touchEnded();
		endScrub();
		if (touchGesture === 'pan') endPan();
		touchGesture = null;
		pointers.clear();
	}

	/** Clear a one-finger scrub's hover. */
	function endScrub() {
		if (touchGesture !== 'scrub') return;
		interactionMode = 'none';
		pointerInside = false;
		chart.clearHover();
		onhoverend?.();
	}

	/** Flush nothing further and report the end of a pan or pinch. */
	function endPan() {
		cancelGestureFrames();
		interactionMode = 'none';
		pinchPrevDist = 0;
		pinchPendingFactor = 1;
		onpanend?.();
	}

	/**
	 * Two-finger moves on a pan-enabled chart are its pan and pinch, never the
	 * page's scroll (`touch-action: pan-y` would otherwise let the browser
	 * scroll a vertical two-finger drag). Non-passive so it can cancel; the
	 * browser can't cancel a scroll already under way when the second finger
	 * lands.
	 * @param {TouchEvent} event
	 */
	function holdTwoFingerTouch(event) {
		if (event.touches.length > 1 && event.cancelable) event.preventDefault();
	}

	// ---- Mouse drag (pan/zoom engaged) ----

	/**
	 * @param {PointerEvent} event
	 */
	function handleMouseDown(event) {
		if (event.pointerType === 'touch' || event.button !== 0) return;
		tapStartX = event.clientX;
		panLastX = event.clientX;
		interactionMode = 'none'; // becomes 'mouse-pan' after threshold
		captureMsPerPx();
		window.addEventListener('pointermove', handleMouseDrag);
		window.addEventListener('pointerup', endMouseDrag);
	}

	/**
	 * @param {PointerEvent} event
	 */
	function handleMouseDrag(event) {
		const dx = Math.abs(event.clientX - tapStartX);
		if (interactionMode === 'none' && dx > PAN_THRESHOLD) {
			interactionMode = 'mouse-pan';
			chart.clearHover();
			onpanstart?.();
		}
		if (interactionMode === 'mouse-pan') {
			event.preventDefault();
			panPendingX = event.clientX;
			panRafId ??= requestAnimationFrame(processPanFrame);
		}
	}

	function endMouseDrag() {
		window.removeEventListener('pointermove', handleMouseDrag);
		window.removeEventListener('pointerup', endMouseDrag);
		if (interactionMode === 'mouse-pan') endPan();
		else cancelGestureFrames();
	}

	function cancelGestureFrames() {
		if (panRafId !== null) {
			cancelAnimationFrame(panRafId);
			panRafId = null;
		}
		if (pinchRafId !== null) {
			cancelAnimationFrame(pinchRafId);
			pinchRafId = null;
		}
	}

	// ---- Mouse hover/click (non-drag) ----

	/**
	 * @param {MouseEvent} event
	 */
	function handleMouseMove(event) {
		if (interactionMode !== 'none' || emulatedMouse.active) return;
		const time = snapTime(clientXToTime(event.clientX));
		// Same snapped bucket as the current hover — nothing to update.
		if (time === chart.hoverTime) return;
		chart.setHover(time);
		onhover?.(time);
	}

	function handleScrollWhileHovered() {
		// Invalidate only — getRect() refreshes lazily on the next pointer use,
		// so momentum scrolling costs zero layout reads.
		cachedRect = null;
	}

	function handleMouseEnter() {
		if (emulatedMouse.active) return;
		pointerInside = true;
		refreshRect();
		// Scroll doesn't bubble — capture catches ancestor scroll containers too.
		window.addEventListener('scroll', handleScrollWhileHovered, { passive: true, capture: true });
	}

	function handleMouseLeave() {
		pointerInside = false;
		window.removeEventListener('scroll', handleScrollWhileHovered, { capture: true });
		if (interactionMode !== 'none') return;
		chart.clearHover();
		onhoverend?.();
	}

	/**
	 * @param {MouseEvent} event
	 */
	function handleClick(event) {
		// A touch tap was handled on pointerup; this is its emulated click.
		if (interactionMode !== 'none' || emulatedMouse.active) return;
		// StackedArea handles clicks on its paths and its line hit area
		// (`data-series-hit`) via onpointerup — skip them, or one click focuses
		// twice (a toggle undone, or a comparison's A and B set together).
		const target = /** @type {Element} */ (event.target);
		if (target.tagName === 'path' || target.hasAttribute('data-series-hit')) return;

		// First tap in tap-to-engage mode engages pan/zoom instead of setting focus.
		if (enablePan && panZoomMode === 'tap-to-engage' && engageOnTap && !engaged) {
			engaged = true;
			return;
		}

		const time = snapTime(clientXToTime(event.clientX));
		onfocus ? onfocus(time) : chart.toggleFocus(time);
	}

	// ---- Wheel (pan/zoom) ----

	/** @type {ReturnType<typeof setTimeout> | null} */
	let wheelPanEndTimeout = null;
	/** @type {number | null} */
	let wheelRafId = null;
	let wheelPendingPanMs = 0;
	let wheelPendingZoomFactor = 1;
	let wheelPendingZoomCenterMs = 0;

	// Trackpads emit wheel events well above the display refresh rate, and each
	// onpan/onzoom triggers the consumer's full slice/aggregate/render cascade.
	// Accumulate intents (deltas sum, factors multiply — same maths as the pinch
	// processor) and flush once per frame, mirroring the pointer rAF machinery.
	function processWheelFrame() {
		wheelRafId = null;
		if (wheelPendingPanMs !== 0) {
			const deltaMs = wheelPendingPanMs;
			wheelPendingPanMs = 0;
			onpan?.(deltaMs);
		}
		if (wheelPendingZoomFactor !== 1) {
			const factor = wheelPendingZoomFactor;
			wheelPendingZoomFactor = 1;
			onzoom?.(factor, wheelPendingZoomCenterMs);
		}
	}

	function scheduleWheelFrame() {
		wheelRafId ??= requestAnimationFrame(processWheelFrame);
	}

	/**
	 * Horizontal scroll pans the viewport; vertical scroll zooms at the
	 * cursor. Fires the same onpan/onzoom callbacks as pointer gestures, so
	 * consumers get wheel support for free.
	 * @param {WheelEvent} event
	 */
	function handleWheel(event) {
		if (!effectiveEnablePan) return;
		if (interactionMode !== 'none') return;
		if (!onpan && !onzoom) return;

		const rect = getRect();
		if (!rect || rect.width === 0) return;

		const domain = getTimeDomain();
		if (!domain) return;

		event.preventDefault();

		const intent = classifyWheelIntent(event.deltaX, event.deltaY);

		if (intent === 'pan') {
			if (!onpan) return;
			wheelPendingPanMs += wheelPanDeltaMs(event.deltaX, rect.width, domain[1] - domain[0]);
			scheduleWheelFrame();

			// The end-of-stream timeout far outlives the pending rAF, so the final
			// pan delta always flushes before onpanend fires.
			if (wheelPanEndTimeout) clearTimeout(wheelPanEndTimeout);
			wheelPanEndTimeout = setTimeout(() => {
				wheelPanEndTimeout = null;
				onpanend?.();
			}, WHEEL_PAN_IDLE_MS);
			return;
		}

		if (!onzoom) return;
		// A pan→zoom transition within one wheel stream is one gesture — keep
		// deferring the pending pan-end so it doesn't fire mid-zoom, an idle gap
		// after the *pan* stopped. It fires once the whole stream goes quiet.
		if (wheelPanEndTimeout) {
			clearTimeout(wheelPanEndTimeout);
			wheelPanEndTimeout = setTimeout(() => {
				wheelPanEndTimeout = null;
				onpanend?.();
			}, WHEEL_PAN_IDLE_MS);
		}
		wheelPendingZoomFactor *= wheelZoomFactor(event.deltaY);
		wheelPendingZoomCenterMs = clientXToTime(event.clientX);
		scheduleWheelFrame();
	}

	// ---- Lifecycle ----

	// Keep the cached rect fresh across element/layout resizes (split-pane
	// drags, chart resize handle) independent of pan being enabled.
	$effect(() => {
		const target = el;
		if (!target) return;
		const observer = new ResizeObserver(() => {
			cachedRect = null;
		});
		observer.observe(target);
		return () => {
			observer.disconnect();
			pointerInside = false;
			window.removeEventListener('scroll', handleScrollWhileHovered, { capture: true });
		};
	});

	// Touch: one finger scrolls the page, scrubs or taps; two fingers pan and
	// pinch. Engaged or not — on touch, pan/zoom needs no engaging.
	$effect(() => {
		const target = el;
		if (!target) return;
		target.addEventListener('pointerdown', handleTouchDown);
		return () => {
			target.removeEventListener('pointerdown', handleTouchDown);
			if (touchGesture) endTouch();
		};
	});

	$effect(() => {
		const target = el;
		if (!target || !touchPanEnabled) return;
		target.addEventListener('touchmove', holdTwoFingerTouch, { passive: false });
		return () => target.removeEventListener('touchmove', holdTwoFingerTouch);
	});

	// Mouse: drag to pan and wheel to zoom, once engaged (or always).
	$effect(() => {
		const target = el;
		if (!target || !effectiveEnablePan) return;

		target.addEventListener('pointerdown', handleMouseDown);
		// Wheel needs `{ passive: false }` so we can preventDefault().
		target.addEventListener('wheel', handleWheel, { passive: false });

		return () => {
			target.removeEventListener('pointerdown', handleMouseDown);
			target.removeEventListener('wheel', handleWheel);
			if (wheelPanEndTimeout) {
				clearTimeout(wheelPanEndTimeout);
				wheelPanEndTimeout = null;
			}
			if (wheelRafId !== null) {
				cancelAnimationFrame(wheelRafId);
				wheelRafId = null;
				wheelPendingPanMs = 0;
				wheelPendingZoomFactor = 1;
			}
			endMouseDrag();
		};
	});

	// While a tap-to-engage chart sits idle, no pan/zoom listeners are attached
	// (the effect above gates on effectiveEnablePan) and a wheel gesture just
	// scrolls the page — silently, at the exact moment the user wants to zoom.
	// A passive listener (never preventDefault — the scroll must continue)
	// notifies the consumer so it can show a "click to enable" hint in place.
	$effect(() => {
		const target = el;
		if (!target || !onblockedwheel) return;
		if (!enablePan || panZoomMode !== 'tap-to-engage' || engaged) return;

		const notify = () => onblockedwheel();
		target.addEventListener('wheel', notify, { passive: true });
		return () => target.removeEventListener('wheel', notify);
	});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={el}
	class={className}
	style:touch-action="pan-y"
	onmouseenter={handleMouseEnter}
	onmousemove={handleMouseMove}
	onmouseleave={handleMouseLeave}
	onclick={handleClick}
>
	{@render children?.()}
</div>
