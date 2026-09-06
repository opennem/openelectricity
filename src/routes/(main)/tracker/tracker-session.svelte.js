import { createChartRangeControl } from '$lib/components/charts/facility/chart-range-control.svelte.js';
import { regionToNetwork } from '$lib/components/charts/network/region-to-network.js';
import { ianaFromOffset } from '$lib/components/charts/v2/network-time.js';
import { formatRangeLabel } from '$lib/components/charts/v2/time-format-policy.js';
import { EARLIEST_DATA_MS } from '$lib/utils/date-range.js';
import { DEFAULT_RANGE_DAYS, normaliseRange, customRangeDates } from './tracker-model.js';
import { normaliseTrackerOverlays, validBucketFilterFor } from './tracker-url.js';

/** Per-page selection and range ownership. Browser history is an injected side effect.
 * @param {import('./types.js').TrackerUrlState & {nowMs: number}} initial
 * @param {(mode: 'push' | 'replace') => void} onchange
 */
export function createTrackerSession(initial, onchange) {
	let selection = $state.raw({ ...initial });
	let viewport = $state.raw({ start: 0, end: 0 });
	let window = $state.raw({ start: 0, end: 0 });
	let connected = $state(false);
	let gestureActive = $state(false);
	const anchorEnd = initial.nowMs;
	const anchorStart = anchorEnd - DEFAULT_RANGE_DAYS * 86_400_000;
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
		timeZone: () => regionToNetwork(selection.region).timeZone,
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
		selection = {
			...selection,
			range: snapshot(),
			bucketFilter: validBucketFilterFor(selection.bucketFilter, snapshot())
		};
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
		anchorStart,
		anchorEnd,
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
			return formatRangeLabel(
				window.start,
				window.end,
				range.displayInterval,
				ianaFromOffset(regionToNetwork(selection.region).timeZone)
			);
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
			selection = { ...selection, ...value };
			applyRange(value.range);
		},
		/** @template {keyof import('./types.js').TrackerUrlState} K
		 * @param {K} key @param {import('./types.js').TrackerUrlState[K]} value
		 * @param {'push' | 'replace' | null} [history] */
		select(key, value, history = 'push') {
			selection = {
				...selection,
				[key]: key === 'overlays' ? normaliseTrackerOverlays(value) : value
			};
			if (history) onchange(history);
		},
		/** @param {number} days */
		selectRange(days) {
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
			range.handleViewportSettle(value);
			settleWindow();
			onchange('replace');
		}
	};
}
