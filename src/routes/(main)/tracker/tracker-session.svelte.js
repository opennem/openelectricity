import { createChartRangeControl } from '$lib/components/charts/facility/chart-range-control.svelte.js';
import { getIntervalHours } from '$lib/components/charts/facility/interval-hours.js';
import { regionToNetwork } from '$lib/components/charts/network/region-to-network.js';
import { ianaFromOffset } from '$lib/components/charts/v2/network-time.js';
import { formatRangeLabel } from '$lib/components/charts/v2/time-format-policy.js';
import { EARLIEST_DATA_MS } from '$lib/utils/date-range.js';
import { getGroup } from '$lib/components/charts/network/groups.js';
import { hasSpotPrice } from './tracker-regions.js';
import { normaliseComparison } from './comparison.js';
import { normaliseProfileView, normaliseProfileDays, normaliseProfileEnd } from './time-of-day.js';
import { DEFAULT_RANGE_DAYS, normaliseRange, customRangeDates } from './tracker-model.js';
import {
	normaliseTrackerOverlays,
	normaliseHiddenSeries,
	normaliseContributionMode,
	normaliseDataTransform,
	validBucketFilterFor
} from './tracker-url.js';

/** @template {import('./types.js').TrackerUrlState} T @param {T} value */
function normaliseSelection(value) {
	return {
		...value,
		profileView: normaliseProfileView(value.profileView),
		profileDays: normaliseProfileDays(value.profileDays),
		profileMetric: /** @type {'power' | 'price'} */ (
			value.profileMetric === 'price' && hasSpotPrice(value.region) ? 'price' : 'power'
		),
		profileSeries: getGroup(value.group).order.includes(value.profileSeries)
			? value.profileSeries
			: '',
		profileEnd: normaliseProfileEnd(value.profileEnd),
		comparison: normaliseComparison(value.comparison),
		hiddenSeries: normaliseHiddenSeries(value.hiddenSeries, value.group),
		contributionMode: normaliseContributionMode(value.contributionMode),
		generationTransform: normaliseDataTransform(value.generationTransform),
		marketValueTransform: normaliseDataTransform(value.marketValueTransform),
		overlays: normaliseTrackerOverlays(value.overlays)
	};
}

/** Per-page selection and range ownership. Browser history is an injected side effect.
 * @param {import('./types.js').TrackerUrlState & {nowMs: number}} initial
 * @param {(mode: 'push' | 'replace') => void} onchange
 */
export function createTrackerSession(initial, onchange) {
	let selection = $state.raw(normaliseSelection(initial));
	let viewport = $state.raw({ start: 0, end: 0 });
	let window = $state.raw({ start: 0, end: 0 });
	let connected = $state(false);
	let gestureActive = $state(false);
	let clockMs = $state(initial.nowMs);
	let anchorEnd = $state(initial.nowMs);
	let anchorStart = $derived(anchorEnd - DEFAULT_RANGE_DAYS * 86_400_000);
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
		get anchorStart() {
			return anchorStart;
		},
		get anchorEnd() {
			return anchorEnd;
		},
		get clockMs() {
			return clockMs;
		},
		get following() {
			return selection.profileView === 'timeline' && selection.range.kind === 'preset';
		},
		/** Advance only relative timeline windows; no history entries for ambient ticks.
		 * @param {number} nowMs @param {boolean} [ready] */
		tick(nowMs, ready = true) {
			clockMs = nowMs;
			if (
				!connected ||
				!ready ||
				gestureActive ||
				selection.profileView !== 'timeline' ||
				selection.range.kind !== 'preset'
			)
				return;
			if (nowMs <= anchorEnd) return;
			// Revisit two native buckets for late observations and open-bucket
			// revisions. Normal request deduplication, HTTP caching and retries apply.
			const tailStart = Math.max(
				window.start,
				window.end -
					2 *
						getIntervalHours(
							range.activeInterval,
							window.end,
							ianaFromOffset(regionToNetwork(selection.region).timeZone)
						) *
						3_600_000
			);
			for (const chart of charts()) chart?.invalidateTail?.(tailStart);
			// All grows at the right edge; never slide the historical data floor.
			range.advanceLiveEdge(nowMs, { preserveStart: selection.range.days === -1 });
			anchorEnd = nowMs;
			settleWindow();
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
			// Analytical history must not re-anchor a relative preset or churn
			// range requests when only visibility/basis/transform changed.
			const rangeChanged =
				selection.region !== value.region ||
				JSON.stringify(selection.range) !== JSON.stringify(value.range);
			selection = normaliseSelection({ ...selection, ...value });
			if (rangeChanged) applyRange(value.range);
		},
		/** @template {keyof import('./types.js').TrackerUrlState} K
		 * @param {K} key @param {import('./types.js').TrackerUrlState[K]} value
		 * @param {'push' | 'replace' | null} [history] */
		select(key, value, history = 'push') {
			selection = normaliseSelection({
				...selection,
				...(key === 'group' && value !== selection.group ? { hiddenSeries: [] } : {}),
				[key]: value
			});
			if (history) onchange(history);
		},
		/** Solo and restore update overlays and fuel-tech visibility in one history entry.
		 * @param {string[]} hiddenSeries @param {import('./types.js').TrackerOverlay[]} [overlays] */
		selectVisibility(hiddenSeries, overlays = selection.overlays) {
			selection = normaliseSelection({ ...selection, hiddenSeries, overlays });
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
