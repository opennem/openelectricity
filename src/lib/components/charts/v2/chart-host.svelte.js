/**
 * createChartHost — the shared "chart host" orchestration behind
 * FacilityChart, NetworkChart and InterconnectorChart.
 *
 * Each of those components used to hand-copy the same ~250 lines: the
 * viewport state + pan/zoom gesture wiring, the manager-swap effect with its
 * warm-revival stash and identity guards, the viewport-change emission, and
 * the public `setViewport`/`reconcileFetches` contract. The copies had
 * already drifted; this module owns the recipe once and exposes the points
 * where the three genuinely differ as config hooks.
 *
 * Must be called during component initialisation (it creates `$effect`s).
 * All config functions are getters so the host reads live component
 * props/deriveds; callbacks close over props the same way.
 *
 * What stays in the component: ChartStore construction and styling, series
 * metadata effects, display aggregation, hover/focus handlers, and any
 * chart-specific extras (SSR cache seeding, background prefetch, empty-window
 * retry) — those read/write the host through its getters/setters.
 *
 * @typedef {import('./ChartDataManager.svelte.js').default} ChartDataManager
 *
 * @typedef {Object} ChartHostConfig
 * @property {() => string | null} cacheKey - Data-source identity (facility
 *   code, `${region}:${kind}`…). Returning null tears the host down (no
 *   manager, stash cleared) until a key reappears — the FacilityChart
 *   "no facility" state.
 * @property {() => string} interval - Native OE interval ('5m', '1h', '1d'…)
 * @property {() => string} metric - API metric
 * @property {() => string} seriesKey - Identity of the processed series set
 * @property {() => string} stashScope - Warm managers survive grain/series
 *   switches within one scope; a scope change (region/facility navigation)
 *   drops them all
 * @property {() => ChartDataManager} createManager - Construct a fresh
 *   manager for the current identity (seed it inside if needed)
 * @property {(manager: ChartDataManager) => { start: number, end: number, request?: boolean } | null} [initialViewport] -
 *   First viewport when none is set yet, decided after fresh construction —
 *   from a seeded cache (`request: false`, data already present) or date
 *   props. Return null to leave the viewport unset.
 * @property {() => number} fetchBufferMultiplier - Viewport-duration multiple
 *   fetched around the visible window
 * @property {() => number} minDateMs - Viewport left-edge floor
 * @property {() => boolean} fineViewportLimits - Sub-daily viewport
 *   duration limits (true) vs energy-scale limits (false)
 * @property {boolean} [reviveRequestImmediate=true] - Whether a warm-revived
 *   manager's viewport request skips the debounce
 * @property {boolean} [seedRequestImmediate=true] - Whether the initial
 *   seeded-viewport request skips the debounce
 * @property {() => void} [onScopeChange] - Fired when stashScope changes on a
 *   live host (e.g. FacilityChart re-arms its empty-window retry)
 * @property {() => void} [onGestureStart] - Gesture began (clear hover here)
 * @property {(range: { start: number, end: number }) => void} [onviewportchange]
 * @property {(range: { start: number, end: number }) => void} [onviewportsettle] -
 *   Fired before the host reconciles, so a parent can flip metric/interval
 *   synchronously and the reconcile skips the outgoing grain
 */

import { untrack } from 'svelte';
import { createManagerStash, managerKey } from './manager-stash.js';
import { createViewportGestures, isViewportPinned } from './viewport-gestures.js';
import { viewportDurationLimits } from '../facility/range-interval-config.js';

/**
 * @param {ChartHostConfig} config
 */
export function createChartHost(config) {
	const {
		cacheKey,
		interval,
		metric,
		seriesKey,
		stashScope,
		createManager,
		initialViewport,
		fetchBufferMultiplier,
		minDateMs,
		fineViewportLimits,
		reviveRequestImmediate = true,
		seedRequestImmediate = true,
		onScopeChange,
		onGestureStart,
		onviewportchange,
		onviewportsettle
	} = config;

	// ============================================
	// Viewport state
	// ============================================

	/** @type {number} */
	let viewStart = $state(0);
	/** @type {number} */
	let viewEnd = $state(0);
	let isPanning = $state(false);

	let MIN_VIEWPORT_MS = $derived(viewportDurationLimits(fineViewportLimits()).minMs);
	let MAX_VIEWPORT_MS = $derived(viewportDurationLimits(fineViewportLimits()).maxMs);

	// ============================================
	// Data manager lifecycle
	// ============================================

	/** @type {ChartDataManager | null} */
	let dataManager = $state(null);

	/**
	 * Warm managers stashed on swap (keyed by grain + series identity) so
	 * switches back — a grouping toggle, a hysteresis metric flip — revive
	 * cached data instantly instead of refetching.
	 */
	const managerStash = createManagerStash();

	/** Scope the stash belongs to — a change invalidates every entry. */
	/** @type {string | undefined} */
	let lastScope = undefined;

	/**
	 * Stash the outgoing manager for an instant back-switch, or retire it when
	 * it belongs to another source.
	 * @param {ChartDataManager | null | undefined} manager
	 * @param {string} currentCacheKey
	 */
	function stashOrDispose(manager, currentCacheKey) {
		if (!manager) return;
		// Dispose first — aborts the outgoing grain's in-flight fetches
		// (refcounted in sharedFetch, so shared URLs survive) while keeping the
		// cache warm.
		manager.dispose();
		if (manager.cacheKey !== currentCacheKey) return;
		managerStash.stash(managerKey(manager.interval, manager.metric, manager.seriesKey), manager);
	}

	/**
	 * Request the given window (± the fetch buffer, clamped to now).
	 * @param {ChartDataManager} manager
	 * @param {number} start
	 * @param {number} end
	 * @param {boolean} immediate
	 */
	function requestWindow(manager, start, end, immediate) {
		const buffer = (end - start) * fetchBufferMultiplier();
		manager.requestRange(start - buffer, Math.min(end + buffer, Date.now()), { immediate });
	}

	// Swap the manager whenever the data-source identity changes; unrelated
	// dependency churn must never refetch.
	$effect(() => {
		const key = cacheKey();
		if (key == null) {
			untrack(() => dataManager)?.dispose();
			dataManager = null;
			managerStash.clear();
			lastScope = undefined;
			return;
		}

		const scope = stashScope();
		const currentInterval = interval();
		const currentMetric = metric();
		const currentSeriesKey = seriesKey();
		if (lastScope !== scope) {
			if (lastScope !== undefined) {
				managerStash.clear();
				onScopeChange?.();
			}
			lastScope = scope;
		}

		const existing = untrack(() => dataManager);
		if (
			existing &&
			existing.cacheKey === key &&
			existing.interval === currentInterval &&
			existing.metric === currentMetric &&
			existing.seriesKey === currentSeriesKey
		) {
			return;
		}

		const vs = untrack(() => viewStart);
		const ve = untrack(() => viewEnd);

		// Revive a warm manager when one matches; a revived manager that still
		// covers the window returns straight from its cache — no fetch.
		const revived = managerStash.take(managerKey(currentInterval, currentMetric, currentSeriesKey));
		if (revived && revived.cacheKey === key) {
			if (vs && ve) requestWindow(revived, vs, ve, reviveRequestImmediate);
			stashOrDispose(existing, key);
			dataManager = revived;
			return;
		}
		// A taken manager for another source must not leak (unreachable when the
		// scope change cleared the stash, but cheap to guard).
		revived?.dispose();

		const manager = createManager();

		if (!vs && !ve) {
			const seed = initialViewport?.(manager);
			if (seed) {
				viewStart = seed.start;
				viewEnd = seed.end;
				if (seed.request !== false) {
					requestWindow(manager, seed.start, seed.end, seedRequestImmediate);
				}
			}
		} else {
			// Grain/series switch — keep the viewport, fetch immediately (no
			// debounce) so data loads even during continuous zoom gestures.
			requestWindow(manager, vs, ve, true);
		}

		stashOrDispose(existing, key);
		dataManager = manager;
	});

	// Retire everything on unmount so in-flight fetches settle as no-ops.
	$effect(() => {
		return () => {
			untrack(() => dataManager)?.dispose();
			managerStash.clear();
			disposeGestures();
		};
	});

	// ============================================
	// Pan / zoom
	// ============================================

	const {
		handlePanStart,
		handlePan,
		handlePanEnd,
		handleZoom,
		zoomIn,
		zoomOut,
		dispose: disposeGestures
	} = createViewportGestures({
		viewport: () => ({ start: viewStart, end: viewEnd }),
		apply: (start, end) => {
			viewStart = start;
			viewEnd = end;
		},
		minDurationMs: () => MIN_VIEWPORT_MS,
		maxDurationMs: () => MAX_VIEWPORT_MS,
		minDateMs: () => minDateMs(),
		onGestureStart: () => {
			isPanning = true;
			onGestureStart?.();
		},
		onGestureEnd: () => {
			isPanning = false;
		},
		onMove: (start, end) => {
			const buffer = (end - start) * fetchBufferMultiplier();
			dataManager?.requestRange(start - buffer, end + buffer);
		},
		// Prefetch ahead in the pan direction
		onPanEnd: (direction, start, end) => {
			const prefetch = (end - start) * fetchBufferMultiplier();
			if (direction === -1) {
				dataManager?.requestRange(end, Math.min(end + prefetch, Date.now()));
			} else {
				dataManager?.requestRange(start - prefetch, start);
			}
		},
		onSettle: (start, end) => {
			// Parent first — it may flip metric/interval synchronously (grain
			// switch); reconcileFetches skips the old grain when that happens.
			onviewportsettle?.({ start, end });
			reconcileFetches();
		}
	});

	// Notify the parent whenever the viewport changes (pan, zoom, setViewport,
	// initial load, metric switch).
	$effect(() => {
		const start = viewStart;
		const end = viewEnd;
		if (!start || !end) return;
		onviewportchange?.({ start, end });
	});

	let isAtMinZoom = $derived(viewEnd - viewStart <= MIN_VIEWPORT_MS);
	let isAtMaxZoom = $derived(
		viewEnd - viewStart >= MAX_VIEWPORT_MS || isViewportPinned(viewStart, viewEnd, minDateMs())
	);

	// ============================================
	// Public API (re-exported by the components)
	// ============================================

	/** @param {number} startMs @param {number} endMs */
	function setViewport(startMs, endMs) {
		const now = Date.now();
		viewStart = Math.max(startMs, minDateMs());
		viewEnd = Math.min(endMs, now);
		// A grain switch is pending (props flipped, manager not yet swapped) —
		// don't fetch the old grain; the swap effect fetches the new one.
		if (dataManager && (dataManager.interval !== interval() || dataManager.metric !== metric())) {
			return;
		}
		const buffer = (viewEnd - viewStart) * fetchBufferMultiplier();
		dataManager?.requestRange(viewStart - buffer, Math.min(viewEnd + buffer, now));
	}

	/**
	 * Cancel in-flight work outside the current buffered window and fetch the
	 * final gaps immediately. Called when a gesture settles — locally via
	 * onSettle, and by parents for peer charts fed per-frame setViewport calls
	 * during the gesture.
	 */
	function reconcileFetches() {
		if (!viewStart || !viewEnd || !dataManager) return;
		if (dataManager.interval !== interval() || dataManager.metric !== metric()) return;
		const buffer = (viewEnd - viewStart) * fetchBufferMultiplier();
		dataManager.reconcileWindow(viewStart - buffer, Math.min(viewEnd + buffer, Date.now()));
	}

	return {
		get dataManager() {
			return dataManager;
		},
		get viewStart() {
			return viewStart;
		},
		set viewStart(value) {
			viewStart = value;
		},
		get viewEnd() {
			return viewEnd;
		},
		set viewEnd(value) {
			viewEnd = value;
		},
		get isPanning() {
			return isPanning;
		},
		get isAtMinZoom() {
			return isAtMinZoom;
		},
		get isAtMaxZoom() {
			return isAtMaxZoom;
		},
		/** For chart-specific extras (background prefetch) that stash managers. */
		get managerStash() {
			return managerStash;
		},
		handlePanStart,
		handlePan,
		handlePanEnd,
		handleZoom,
		zoomIn,
		zoomOut,
		setViewport,
		reconcileFetches
	};
}
