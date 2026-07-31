import { describe, it, expect } from 'vitest';
import { createChartRangeControl } from './chart-range-control.svelte.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_MS = 60 * 1000;

/**
 * Owner-side harness mirroring InterconnectorDetail's wiring: viewport state,
 * a live anchor, and recording stub charts.
 * @param {{ anchorEnd: number, viewStart: number, viewEnd: number }} init
 */
function createHarness({ anchorEnd, viewStart, viewEnd }) {
	const state = {
		anchorEnd,
		anchorStart: anchorEnd - DAY_MS,
		viewStart,
		viewEnd
	};
	/** @type {{ start: number, end: number }[]} */
	const pushes = [];
	const chart = {
		setViewport: (/** @type {number} */ start, /** @type {number} */ end) =>
			void pushes.push({ start, end })
	};
	const range = createChartRangeControl({
		viewport: () => ({ start: state.viewStart, end: state.viewEnd }),
		defaultViewport: () => ({ start: state.anchorStart, end: state.anchorEnd }),
		setViewport: (startMs, endMs) => {
			state.viewStart = startMs;
			state.viewEnd = endMs;
		},
		charts: () => [chart],
		timeZone: () => '+10:00',
		initialRangeDays: 1
	});
	return { state, pushes, range };
}

describe('advanceLiveEdge', () => {
	it('slides a pinned viewport forward preserving the span, and pushes to the charts', () => {
		const anchorEnd = Date.now();
		const { state, pushes, range } = createHarness({
			anchorEnd,
			viewStart: anchorEnd - DAY_MS,
			viewEnd: anchorEnd
		});

		const newEnd = anchorEnd + 5 * MIN_MS;
		range.advanceLiveEdge(newEnd);

		expect(state.viewEnd).toBe(newEnd);
		expect(state.viewEnd - state.viewStart).toBe(DAY_MS);
		expect(pushes).toEqual([{ start: newEnd - DAY_MS, end: newEnd }]);
	});

	it('keeps a zoomed-in span that still touches the live edge', () => {
		const anchorEnd = Date.now();
		const span = 3 * 60 * MIN_MS; // zoomed to 3 hours, right edge live
		const { state, range } = createHarness({
			anchorEnd,
			viewStart: anchorEnd - span,
			viewEnd: anchorEnd
		});

		const newEnd = anchorEnd + 5 * MIN_MS;
		range.advanceLiveEdge(newEnd);

		expect(state.viewEnd).toBe(newEnd);
		expect(state.viewEnd - state.viewStart).toBe(span);
	});

	it('leaves a viewport panned into history untouched', () => {
		const anchorEnd = Date.now();
		// Right edge trails the anchor by an hour — beyond the pinned tolerance.
		const viewEnd = anchorEnd - 60 * MIN_MS;
		const { state, pushes, range } = createHarness({
			anchorEnd,
			viewStart: viewEnd - DAY_MS,
			viewEnd
		});

		range.advanceLiveEdge(anchorEnd + 5 * MIN_MS);

		expect(state.viewEnd).toBe(viewEnd);
		expect(pushes).toEqual([]);
	});

	it('does not disturb preset, display interval, or the pending pulse', () => {
		const anchorEnd = Date.now();
		const { range } = createHarness({
			anchorEnd,
			viewStart: anchorEnd - DAY_MS,
			viewEnd: anchorEnd
		});
		const before = {
			selectedRange: range.selectedRange,
			displayInterval: range.displayInterval,
			activeInterval: range.activeInterval,
			pending: range.rangeSwitchPending
		};

		range.advanceLiveEdge(anchorEnd + 5 * MIN_MS);

		expect(range.selectedRange).toBe(before.selectedRange);
		expect(range.displayInterval).toBe(before.displayInterval);
		expect(range.activeInterval).toBe(before.activeInterval);
		expect(range.rangeSwitchPending).toBe(before.pending);
	});

	it('treats an unreported (zero) viewport as pinned via the default fallback', () => {
		const anchorEnd = Date.now();
		const { state, range } = createHarness({ anchorEnd, viewStart: 0, viewEnd: 0 });

		const newEnd = anchorEnd + 5 * MIN_MS;
		range.advanceLiveEdge(newEnd);

		expect(state.viewEnd).toBe(newEnd);
		expect(state.viewEnd - state.viewStart).toBe(DAY_MS);
	});
});
