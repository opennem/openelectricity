/**
 * createChartRangeControl — shared range/interval/preset state machine for
 * facility-style charts (the /facility/[code] page and the unit detail sheet).
 *
 * Owns the metric/interval/display-interval/preset state and the switching
 * rules: explicit preset picks, calendar ranges, interval-dropdown picks and
 * pan/zoom hysteresis. The *viewport values* stay with the owner (they belong
 * to the chart and its sibling consumers): the controller reads them through
 * the `viewport`/`defaultViewport` getters and stores them back through
 * `setViewport`. Pushing a range into the charts that own their viewport
 * internally (with the echo suppressed) is handled here, so every owner shares
 * one copy of the sync protocol.
 *
 * Two kinds of consumer sync differently, and the split matters:
 *   - *Imperative charts* own a viewport internally and are pushed to through
 *     `setViewport` — the generation chart, and any `NetworkChart` alongside it.
 *     They're listed in `charts`.
 *   - *Providers* (price/market-value, intensity/emissions-volume) take the
 *     owner's viewport as props and need no push; they only report back.
 */

import {
	getMetricIntervalForDays,
	getHysteresisTarget,
	getDisplayIntervalForDays
} from '$lib/utils/metric-interval';
import {
	getIntervalSpec,
	getPresetByDays,
	getDefaultIntervalForRange,
	getIntervalOptionsForDays
} from './range-interval-config.js';
import { MIN_DATE } from '$lib/utils/date-range';
import { toNetworkDateString } from '$lib/components/charts/v2/network-time.js';
import { createEchoGuard } from '$lib/components/charts/v2/echo-guard.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** How far the viewport's right edge may trail the live anchor and still count
 *  as "pinned to live" for `advanceLiveEdge` — two dispatch intervals, so a
 *  zoom that lands fractionally off the edge doesn't strand the chart. */
const LIVE_EDGE_TOLERANCE_MS = 10 * 60 * 1000;

/**
 * A chart that owns its viewport internally and is driven imperatively.
 * @typedef {Object} RangeControlChart
 * @property {(startMs: number, endMs: number) => void} setViewport
 * @property {() => void} [reconcileFetches]
 */

/**
 * @param {{
 *   viewport: () => { start: number, end: number },
 *   defaultViewport: () => { start: number, end: number },
 *   setViewport: (startMs: number, endMs: number) => void,
 *   charts: () => Array<RangeControlChart | undefined | null>,
 *   timeZone: () => string,
 *   earliestDate?: () => string | null,
 *   initialRangeDays?: number,
 *   includeRolling?: boolean
 * }} config
 *   - `viewport` — the live chart viewport (zeros before the chart first reports)
 *   - `defaultViewport` — fallback bounds while the live viewport is unset
 *   - `setViewport` — store the new viewport in the owner's state
 *   - `charts` — the charts that own their viewport internally; pushes to them
 *     are echo-suppressed, and they're reconciled together when a gesture settles
 *   - `timeZone` — network offset (e.g. '+10:00') for picker date strings
 *   - `earliestDate` — earliest data date, the floor for the "All" preset
 *   - `includeRolling` — preserve rolling picks while pan/zoom changes the range tier
 */
export function createChartRangeControl(config) {
	const { viewport, defaultViewport, setViewport, charts, timeZone, earliestDate } = config;
	const initialRangeDays = config.initialRangeDays ?? 3;
	const includeRolling = config.includeRolling ?? false;

	function initialDisplayInterval() {
		const preset = getPresetByDays(initialRangeDays);
		return preset
			? getDefaultIntervalForRange(preset.id)
			: getMetricIntervalForDays(initialRangeDays).interval;
	}

	let activeInterval = $state('5m');
	/** @type {'power' | 'energy'} */
	let activeMetric = $state('power');
	let displayInterval = $state(initialDisplayInterval());

	/** Selected range preset in days (-1 = All). null when a custom date range
	 *  is in use or the user has panned/zoomed off any preset. */
	/** @type {number | null} */
	let selectedRange = $state(initialRangeDays);

	/** True from an explicit range/interval pick until the switched data settles
	 *  (owner calls `settle()`) — pulses the active range control. */
	let rangeSwitchPending = $state(false);

	/** Whether the current display interval came from an explicit dropdown pick.
	 *  A pan/zoom that doesn't cross a native fetch threshold must not clobber
	 *  the pick back to the auto grain; crossing a threshold (or a preset /
	 *  calendar selection) re-derives it. */
	let stickyDisplay = false;

	/** Preserve an explicit interval while its range tier supports it. */
	let pinnedInterval = false;

	/** @param {number} durationDays */
	function shouldKeepPinnedInterval(durationDays) {
		if (!pinnedInterval) return false;
		if (
			getIntervalOptionsForDays(durationDays, { includeRolling }).options.includes(displayInterval)
		) {
			return true;
		}
		pinnedInterval = false;
		return false;
	}

	/** Bumped when a gesture settles so the derived-chart providers cancel their
	 *  stale in-flight fetches too — shared-URL requests only abort once every
	 *  manager holding a reference has cancelled (sharedFetch refcounts). */
	let reconcileSeq = $state(0);

	/** Suppression guard so pushing a viewport into the charts doesn't echo back
	 *  through their own `onviewportchange`. */
	const echo = createEchoGuard();

	/**
	 * Mirror a range into every imperative chart, inside one guarded window so
	 * none of their echoes re-enter the controller.
	 * @param {number} startMs
	 * @param {number} endMs
	 * @param {RangeControlChart | null} [source] - The chart the range came from,
	 *   skipped so a gesture isn't pushed back into the chart being dragged.
	 */
	function pushToCharts(startMs, endMs, source = null) {
		echo.run(() => {
			for (const c of charts()) {
				if (!c || c === source) continue;
				c.setViewport(startMs, endMs);
			}
		});
	}

	/** Live viewport with default fallbacks while the chart hasn't reported. */
	function boundedViewport() {
		const live = viewport();
		const fallback = defaultViewport();
		return { start: live.start || fallback.start, end: live.end || fallback.end };
	}

	/** Mid-gesture display-interval adaptation: re-aggregate the current grain so
	 *  point counts stay bounded while zooming, without touching metric/interval
	 *  (no fetch). Explicit dropdown picks are preserved (see `stickyDisplay`). */
	/** @param {{ start: number, end: number }} range */
	function updateLiveDisplayInterval(range) {
		if (stickyDisplay) return;
		const durationDays = (range.end - range.start) / DAY_MS;
		if (shouldKeepPinnedInterval(durationDays)) return;
		displayInterval = getDisplayIntervalForDays(activeMetric, activeInterval, durationDays);
	}

	/** Hysteresis-aware metric/interval switching — evaluated once per gesture,
	 *  when it settles, with the final viewport. Keeps the current axis where it
	 *  is unless duration crosses an 8/10-day (and 300/365-day, 1500/1825-day)
	 *  threshold. Settle-time evaluation replaces the old 300ms timer, which
	 *  could apply a switch computed against a viewport the user had already
	 *  zoomed back out of. */
	/** @param {{ start: number, end: number }} range */
	function applyMetricSwitch(range) {
		const durationDays = (range.end - range.start) / DAY_MS;
		if (shouldKeepPinnedInterval(durationDays)) return;
		const next = getHysteresisTarget(activeMetric, activeInterval, durationDays);
		if (!next) return;
		stickyDisplay = false;
		displayInterval = getDisplayIntervalForDays(next.metric, next.interval, durationDays);
		activeMetric = next.metric;
		activeInterval = next.interval;
	}

	/** Explicit selection (preset, custom dates, or interval dropdown) — resolves
	 *  the interval id to its native fetch grain via the config, stores the new
	 *  viewport, and pushes it into the chart. */
	/**
	 * @param {number} startMs
	 * @param {number} endMs
	 * @param {string} intervalId
	 * @param {{ sticky?: boolean }} [options]
	 */
	function applyRangeSwitch(startMs, endMs, intervalId, { sticky = false } = {}) {
		const spec = getIntervalSpec(intervalId);
		if (!spec) return;
		rangeSwitchPending = true;
		stickyDisplay = sticky;
		pinnedInterval = true;
		activeMetric = spec.metric;
		activeInterval = spec.apiInterval;
		displayInterval = intervalId;
		setViewport(startMs, endMs);
		pushToCharts(startMs, endMs);
	}

	/** @param {number} days */
	function handleRangeSelect(days) {
		selectedRange = days;
		const endMs = defaultViewport().end;
		let actualDays = days;
		if (days === -1) {
			const earliest = earliestDate?.() ?? null;
			const earliestMs = earliest ? new Date(earliest).getTime() : new Date(MIN_DATE).getTime();
			actualDays = Math.max(1, Math.ceil((endMs - earliestMs) / DAY_MS));
		}
		const startMs = endMs - actualDays * DAY_MS;
		const preset = getPresetByDays(days);
		const intervalId = preset
			? getDefaultIntervalForRange(preset.id)
			: getMetricIntervalForDays(actualDays).interval;
		applyRangeSwitch(startMs, endMs, intervalId);
	}

	/** @param {{ start: string, end: string }} range */
	function handleDateRangeChange(range) {
		selectedRange = null;
		const startMs = new Date(range.start).getTime();
		const endMs = new Date(range.end).getTime();
		const days = Math.max(1, Math.ceil((endMs - startMs) / DAY_MS));
		applyRangeSwitch(startMs, endMs, getIntervalOptionsForDays(days).default);
	}

	/** Manual interval override from the dropdown. Keeps the current viewport and
	 *  refetches at the chosen grain. A later preset or calendar pick re-derives
	 *  the interval; pans/zooms preserve the pick until they cross a native fetch
	 *  threshold (see `stickyDisplay`). */
	/** @param {string} value */
	function handleIntervalChange(value) {
		const { start, end } = boundedViewport();
		applyRangeSwitch(start, end, value, { sticky: true });
	}

	/** Pan/zoom-driven viewport change from the generation chart when it is the
	 *  ONLY imperative chart (FacilityCompactCharts — its siblings are
	 *  providers that follow the owner's viewport props, so nothing needs
	 *  pushing). Hosts with peer imperative charts (the facility page's
	 *  curtailment panel) must wire the generation chart through
	 *  `handleDerivedViewportChange(range, powerChart)` instead, or its
	 *  gestures never mirror into the peers. */
	/** @param {{ start: number, end: number }} range */
	function handleChartViewportChange(range) {
		if (echo.suppressed) return;
		setViewport(range.start, range.end);
		selectedRange = null;
		updateLiveDisplayInterval(range);
	}

	/** Viewport change emitted by anything other than the generation chart — a
	 *  derived-chart provider (financial OR emissions), or another imperative
	 *  chart such as the curtailment panel. Providers react to the owner's
	 *  viewport state and need nothing pushed back; the imperative charts own
	 *  their viewport internally, so the new range is mirrored into them with the
	 *  echo suppressed.
	 *
	 *  Pass `source` when the emitter is itself one of `charts` — it's skipped, so
	 *  a gesture is never pushed back into the chart being dragged (which would
	 *  re-request its range every frame).
	 *  @param {{ start: number, end: number }} range
	 *  @param {RangeControlChart | null} [source] */
	function handleDerivedViewportChange(range, source = null) {
		if (echo.suppressed) return;
		setViewport(range.start, range.end);
		selectedRange = null;
		updateLiveDisplayInterval(range);
		pushToCharts(range.start, range.end, source);
	}

	/** A gesture on any of the charts or a derived chart came to rest: evaluate
	 *  the hysteresis switch once with the final viewport, then prune stale
	 *  in-flight fetches everywhere — the imperative charts directly, the
	 *  providers via `reconcileSeq`. Both are no-ops for the component that
	 *  settled (it reconciled itself) and skip the old grain when a switch fired.
	 *
	 *  Deliberately NOT echo-guarded: settles only ever originate from user
	 *  gestures (`setViewport` never fires one), so they can't echo — and a
	 *  derived-chart button zoom runs its viewport push (which raises the
	 *  guard until a microtask) and this settle in the same synchronous task,
	 *  so a guard here would swallow exactly those settles. */
	/** @param {{ start: number, end: number }} range */
	function handleViewportSettle(range) {
		applyMetricSwitch(range);
		reconcileSeq++;
		for (const c of charts()) c?.reconcileFetches?.();
	}

	/** Ambient live-edge tick: slide the viewport (and every imperative chart)
	 *  forward to `newEndMs` keeping the current span — but only while the user
	 *  is still pinned to the previous live edge (within
	 *  LIVE_EDGE_TOLERANCE_MS of `defaultViewport().end`); a viewport panned or
	 *  zoomed into history is left alone. Unlike `applyRangeSwitch` this
	 *  deliberately touches neither selectedRange / metric / interval /
	 *  displayInterval nor `rangeSwitchPending` — the span is unchanged and the
	 *  tick is ambient, not an explicit pick. The charts' own setViewport
	 *  fetches the new tail. Callers must update their default-viewport anchor
	 *  AFTER calling — the pinned test reads the previous anchor. */
	/** @param {number} newEndMs */
	function advanceLiveEdge(newEndMs) {
		const { start, end } = boundedViewport();
		if (end < defaultViewport().end - LIVE_EDGE_TOLERANCE_MS) return;
		const newStart = newEndMs - (end - start);
		setViewport(newStart, newEndMs);
		pushToCharts(newStart, newEndMs);
	}

	/** Clear the pending pulse once switched data settles (load-complete or the
	 *  debounced visible-data callback, whichever fires first). */
	function settle() {
		rangeSwitchPending = false;
	}

	/** Reset for a new facility/unit — back to the initial power grain. */
	function reset() {
		activeInterval = '5m';
		activeMetric = 'power';
		displayInterval = initialDisplayInterval();
		rangeSwitchPending = false;
		stickyDisplay = false;
		pinnedInterval = false;
	}

	return {
		get activeInterval() {
			return activeInterval;
		},
		get activeMetric() {
			return activeMetric;
		},
		get displayInterval() {
			return displayInterval;
		},
		get selectedRange() {
			return selectedRange;
		},
		get rangeSwitchPending() {
			return rangeSwitchPending;
		},
		/** Pass to the derived-chart providers' `reconcileSeq` prop. */
		get reconcileSeq() {
			return reconcileSeq;
		},
		/** Span of the current view in days — drives the interval options offered
		 *  for a custom (calendar) range when no preset is active. */
		get customDays() {
			const { start, end } = boundedViewport();
			return Math.max(1, Math.ceil((end - start) / DAY_MS));
		},
		/** Live picker dates so the calendar popover always reflects what's visible. */
		get pickerStartDate() {
			return toNetworkDateString(boundedViewport().start, timeZone());
		},
		get pickerEndDate() {
			return toNetworkDateString(boundedViewport().end, timeZone());
		},
		/** Latest selectable date — "now", or the retired anchor. */
		get maxDate() {
			return toNetworkDateString(defaultViewport().end, timeZone());
		},
		handleRangeSelect,
		handleDateRangeChange,
		handleIntervalChange,
		handleChartViewportChange,
		handleDerivedViewportChange,
		handleViewportSettle,
		advanceLiveEdge,
		settle,
		reset
	};
}
