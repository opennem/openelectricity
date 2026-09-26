import { createChartRangeControl } from '$lib/components/charts/facility/chart-range-control.svelte.js';
import { getIntervalHours } from '$lib/components/charts/facility/interval-hours.js';
import { regionToNetwork } from '$lib/components/charts/network/region-to-network.js';
import { ianaFromOffset } from '$lib/components/charts/v2/network-time.js';
import { formatRangeLabel } from '$lib/components/charts/v2/time-format-policy.js';
import { EARLIEST_DATA_MS } from '$lib/utils/date-range.js';
import { DEFAULT_RANGE_DAYS, normaliseRange, customRangeDates } from './tracker-model.js';
import { normaliseTrackerState, parseTrackerUrl } from './tracker-url.js';

/** Per-page selection and range ownership. Browser history is an injected side effect.
 * @param {import('./types.js').TrackerUrlState & {nowMs: number}} initial
 * @param {(mode: 'push' | 'replace', resetQuery?: boolean) => void} onchange
 */
export function createTrackerSession(initial, onchange) {
	let selection = $state.raw(normaliseTrackerState(initial));
	let viewport = $state.raw({ start: 0, end: 0 });
	let window = $state.raw({ start: 0, end: 0 });
	let connected = $state(false);
	let gestureActive = $state(false);
	let clockMs = $state(initial.nowMs);
	let anchorEnd = $state(initial.nowMs);
	let anchorStart = $derived(anchorEnd - DEFAULT_RANGE_DAYS * 86_400_000);
	let view = $derived(selection.view);
	/** Network offset ('+10:00' | '+08:00') and its IANA name for the selected scope. */
	let timeZone = $derived(regionToNetwork(selection.region).timeZone);
	let ianaTimeZone = $derived(ianaFromOffset(timeZone));
	/** Relative timeline presets follow the latest data; everything else is pinned. */
	let following = $derived(view === 'timeline' && selection.range.kind === 'preset');
	/** @type {() => Array<import('$lib/components/charts/facility/chart-range-control.svelte.js').RangeControlChart | null | undefined>} */
	let charts = () => [];
	const range = createChartRangeControl({
		viewport: () => viewport,
		defaultViewport: () => ({ start: anchorStart, end: anchorEnd }),
		setViewport: (start, end) => {
			// All rounds up to whole days; match the chart host's data floor so
			// query identity describes the actual viewport, not its earlier seed.
			viewport = { start: Math.max(start, EARLIEST_DATA_MS), end };
		},
		charts: () => charts(),
		timeZone: () => timeZone,
		initialRangeDays: DEFAULT_RANGE_DAYS,
		includeRolling: true
	});

	function snapshot() {
		return normaliseRange(
			range.selectedRange == null
				? {
						kind: 'custom',
						startMs: window.start,
						endMs: window.end,
						intervalId: range.displayInterval
					}
				: { kind: 'preset', days: range.selectedRange, intervalId: range.displayInterval }
		);
	}

	function settleWindow() {
		window = viewport;
		// Re-normalising validates the calendar filter against the settled range.
		selection = normaliseTrackerState({ ...selection, range: snapshot() });
	}

	/** @param {import('./types.js').TrackerRange} value */
	function applyRange(value) {
		gestureActive = false;
		const next = normaliseRange(value);
		if (next.kind === 'preset') range.handleRangeSelect(next.days);
		else range.handleDateRangeChange(customRangeDates(next));
		if (next.intervalId !== range.displayInterval) range.handleIntervalChange(next.intervalId);
		settleWindow();
	}
	applyRange(initial.range);

	/** @param {() => void} change */
	function chooseRange(change) {
		gestureActive = false;
		change();
		settleWindow();
		onchange('push');
	}

	return {
		range,
		get anchorStart() {
			return anchorStart;
		},
		get anchorEnd() {
			return anchorEnd;
		},
		get clockMs() {
			return clockMs;
		},
		get view() {
			return view;
		},
		get timeZone() {
			return timeZone;
		},
		get ianaTimeZone() {
			return ianaTimeZone;
		},
		get following() {
			return following;
		},
		/** Move the freshness clock without touching data.
		 * @param {number} nowMs */
		setClock(nowMs) {
			clockMs = nowMs;
		},
		/** The reader asked for fresh data. Every connected chart revisits its two
		 * newest native buckets for late observations and open-bucket revisions, and
		 * a following timeline also advances to now; paused windows keep their bounds.
		 * Never mid-gesture, never a history entry. A plain refresh waits for busy
		 * requests; a `force`d one (the reader's tap or key) goes ahead and bypasses
		 * response caches so the server answers afresh.
		 * @param {number} nowMs @param {{ ready?: boolean, force?: boolean }} [options]
		 * @returns {boolean} whether it ran */
		refresh(nowMs, { ready = true, force = false } = {}) {
			clockMs = nowMs;
			if (!connected || (!ready && !force) || gestureActive || view !== 'timeline') return false;
			const tailStart = Math.max(
				window.start,
				window.end -
					2 * getIntervalHours(range.activeInterval, window.end, ianaTimeZone) * 3_600_000
			);
			for (const chart of charts()) chart?.invalidateTail?.(tailStart, { force });
			if (following && nowMs > anchorEnd) {
				// All grows at the right edge; never slide the historical data floor.
				range.advanceLiveEdge(nowMs, {
					preserveStart: selection.range.kind === 'preset' && selection.range.days === -1
				});
				anchorEnd = nowMs;
			}
			settleWindow();
			return true;
		},
		get selection() {
			return selection;
		},
		get window() {
			return window;
		},
		get connected() {
			return connected;
		},
		get gestureActive() {
			return gestureActive;
		},
		set gestureActive(value) {
			gestureActive = value;
		},
		get rangeLabel() {
			return formatRangeLabel(window.start, window.end, range.displayInterval, ianaTimeZone);
		},
		/** @param {typeof charts} getCharts */
		connect(getCharts) {
			charts = getCharts;
			connected = true;
			// Reapply through the controller's echo guard once component handles exist.
			applyRange(selection.range);
			return () => {
				charts = () => [];
				connected = false;
			};
		},
		/** @param {import('./types.js').TrackerUrlState} value */
		restore(value) {
			// Analytical history must not re-anchor a relative preset or churn
			// range requests when only visibility/basis/transform changed.
			const rangeChanged =
				selection.region !== value.region ||
				JSON.stringify(selection.range) !== JSON.stringify(value.range);
			selection = normaliseTrackerState({ ...selection, ...value });
			if (rangeChanged) applyRange(value.range);
		},
		/** @template {keyof import('./types.js').TrackerUrlState} K
		 * @param {K} key @param {import('./types.js').TrackerUrlState[K]} value
		 * @param {'push' | 'replace' | null} [history] */
		select(key, value, history = 'push') {
			selection = normaliseTrackerState({
				...selection,
				...(key === 'group' && value !== selection.group ? { hiddenSeries: [] } : {}),
				[key]: value
			});
			if (history) onchange(history);
		},
		/** Explicit view switches start with defaults; restore() preserves history.
		 * @param {string} next - A `TrackerView`; unknown values fall back to Timeline */
		selectView(next) {
			if (next === view) return;
			anchorEnd = clockMs = Date.now();
			// eslint-disable-next-line svelte/prefer-svelte-reactivity -- transient parameters for parsing defaults
			const params = new URLSearchParams({ view: next });
			selection = parseTrackerUrl(params, { nowMs: clockMs });
			applyRange(selection.range);
			onchange('push', true);
		},
		/** Solo and restore update overlays and fuel-tech visibility in one history entry.
		 * @param {string[]} hiddenSeries @param {import('./types.js').TrackerOverlay[]} [overlays] */
		selectVisibility(hiddenSeries, overlays = selection.overlays) {
			selection = normaliseTrackerState({ ...selection, hiddenSeries, overlays });
			onchange('push');
		},
		/** @param {number} days */
		selectRange(days) {
			anchorEnd = clockMs = Date.now();
			chooseRange(() => range.handleRangeSelect(days));
		},
		/** @param {{start: string, end: string}} dates */
		selectDates(dates) {
			chooseRange(() => range.handleDateRangeChange(dates));
		},
		/** @param {string} value */
		selectInterval(value) {
			chooseRange(() => range.handleIntervalChange(value));
		},
		/** @param {{start: number, end: number}} value
		 * @param {import('$lib/components/charts/facility/chart-range-control.svelte.js').RangeControlChart | null | undefined} source */
		moveViewport(value, source) {
			range.handleDerivedViewportChange(value, source);
		},
		/** @param {{start: number, end: number}} value */
		settleViewport(value) {
			gestureActive = false;
			// Button zoom settles before the chart emits its reactive viewport change.
			range.handleDerivedViewportChange(value);
			range.handleViewportSettle(value);
			settleWindow();
			onchange('replace');
		}
	};
}
