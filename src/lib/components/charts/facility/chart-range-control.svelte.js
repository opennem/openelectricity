/**
 * createChartRangeControl — shared range/interval/preset state machine for
 * facility-style charts (the /facility/[code] page and the unit detail sheet).
 *
 * Owns the metric/interval/display-interval/preset state and the switching
 * rules: explicit preset picks, calendar ranges, interval-dropdown picks and
 * pan/zoom hysteresis. The *viewport values* stay with the owner (they belong
 * to the chart and its sibling consumers): the controller reads them through
 * the `viewport`/`defaultViewport` getters and stores them back through
 * `setViewport`. Pushing a range into the generation chart (with the echo
 * suppressed) is handled here, so both owners share one copy of the
 * sync protocol.
 */

import {
	getMetricIntervalForDays,
	getHysteresisSwitch,
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

/**
 * @param {{
 *   viewport: () => { start: number, end: number },
 *   defaultViewport: () => { start: number, end: number },
 *   setViewport: (startMs: number, endMs: number) => void,
 *   chart: () => { setViewport: (startMs: number, endMs: number) => void } | undefined | null,
 *   timeZone: () => string,
 *   earliestDate?: () => string | null,
 *   initialRangeDays?: number
 * }} config
 *   - `viewport` — the live chart viewport (zeros before the chart first reports)
 *   - `defaultViewport` — fallback bounds while the live viewport is unset
 *   - `setViewport` — store the new viewport in the owner's state
 *   - `chart` — the generation chart instance (viewport pushes are echo-suppressed)
 *   - `timeZone` — network offset (e.g. '+10:00') for picker date strings
 *   - `earliestDate` — earliest data date, the floor for the "All" preset
 */
export function createChartRangeControl(config) {
	const { viewport, defaultViewport, setViewport, chart, timeZone, earliestDate } = config;
	const initialRangeDays = config.initialRangeDays ?? 3;

	function initialDisplayInterval() {
		const preset = getPresetByDays(initialRangeDays);
		return preset
			? getDefaultIntervalForRange(preset.id)
			: getMetricIntervalForDays(initialRangeDays).interval;
	}

	let activeInterval = $state('5m');
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

	/** @type {ReturnType<typeof setTimeout> | null} */
	let metricSwitchTimer = null;

	/** Suppression guard so pushing a viewport into the generation chart doesn't
	 *  echo back through its own `onviewportchange`. */
	const echo = createEchoGuard();

	/**
	 * @param {number} startMs
	 * @param {number} endMs
	 */
	function pushToChart(startMs, endMs) {
		const c = chart();
		if (!c) return;
		echo.run(() => c.setViewport(startMs, endMs));
	}

	/** Live viewport with default fallbacks while the chart hasn't reported. */
	function boundedViewport() {
		const live = viewport();
		const fallback = defaultViewport();
		return { start: live.start || fallback.start, end: live.end || fallback.end };
	}

	/** Hysteresis-aware metric/interval switching for pan/zoom — keeps the
	 *  current axis where it is unless duration crosses an 8/10-day (and
	 *  300/365-day, 1500/1825-day) threshold. Display interval is recomputed
	 *  every tick from the (possibly newly-targeted) metric/interval. */
	/** @param {{ start: number, end: number }} range */
	function applyMetricSwitch(range) {
		const durationDays = (range.end - range.start) / DAY_MS;
		const next = getHysteresisSwitch(activeMetric, activeInterval, durationDays);

		// Preserve an explicit dropdown pick across pans and zooms that don't
		// cross a native fetch threshold.
		if (!next && stickyDisplay) return;

		displayInterval = getDisplayIntervalForDays(
			next?.metric ?? activeMetric,
			next?.interval ?? activeInterval,
			durationDays
		);

		if (next) {
			stickyDisplay = false;
			if (metricSwitchTimer) clearTimeout(metricSwitchTimer);
			metricSwitchTimer = setTimeout(() => {
				activeMetric = next.metric;
				activeInterval = next.interval;
			}, 300);
		}
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
		activeMetric = spec.metric;
		activeInterval = spec.apiInterval;
		displayInterval = intervalId;
		setViewport(startMs, endMs);
		pushToChart(startMs, endMs);
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

	/** Pan/zoom-driven viewport change from the generation chart. */
	/** @param {{ start: number, end: number }} range */
	function handleChartViewportChange(range) {
		if (echo.suppressed) return;
		setViewport(range.start, range.end);
		selectedRange = null;
		applyMetricSwitch(range);
	}

	/** Viewport change emitted by a derived-chart provider (financial OR
	 *  emissions). Providers react to the owner's viewport state; the generation
	 *  chart owns its viewport internally, so the new range is mirrored into it
	 *  with the echo suppressed. */
	/** @param {{ start: number, end: number }} range */
	function handleDerivedViewportChange(range) {
		if (echo.suppressed) return;
		setViewport(range.start, range.end);
		selectedRange = null;
		applyMetricSwitch(range);
		pushToChart(range.start, range.end);
	}

	/** Cancel the delayed metric switch — call on owner unmount. */
	function dispose() {
		if (metricSwitchTimer) clearTimeout(metricSwitchTimer);
		metricSwitchTimer = null;
	}

	/** Clear the pending pulse once switched data settles (load-complete or the
	 *  debounced visible-data callback, whichever fires first). */
	function settle() {
		rangeSwitchPending = false;
	}

	/** Reset for a new facility/unit — back to the initial power grain. */
	function reset() {
		dispose();
		activeInterval = '5m';
		activeMetric = 'power';
		displayInterval = initialDisplayInterval();
		rangeSwitchPending = false;
		stickyDisplay = false;
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
		settle,
		reset,
		dispose
	};
}
