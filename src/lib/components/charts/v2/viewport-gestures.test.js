import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createViewportGestures } from './viewport-gestures.js';

const HOUR = 60 * 60 * 1000;
const NOW = new Date('2026-06-01T12:00:00Z').getTime();

/**
 * Harness with a mutable viewport that `apply` writes back to, mirroring the
 * chart components.
 * @param {Partial<import('./viewport-gestures.js').ViewportGesturesConfig>} [overrides]
 */
function harness(overrides = {}) {
	const state = { start: NOW - 48 * HOUR, end: NOW - 24 * HOUR };
	const applied = /** @type {Array<[number, number]>} */ ([]);
	const gestures = createViewportGestures({
		viewport: () => ({ start: state.start, end: state.end }),
		apply: (start, end) => {
			state.start = start;
			state.end = end;
			applied.push([start, end]);
		},
		...overrides
	});
	return { state, applied, gestures };
}

describe('createViewportGestures', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('pan', () => {
		it('shifts the viewport against the drag delta', () => {
			const { state, gestures } = harness();
			const start = state.start;
			gestures.handlePan(2 * HOUR); // drag right → back in time

			expect(state.start).toBe(start - 2 * HOUR);
			expect(state.end - state.start).toBe(24 * HOUR);
		});

		it('clamps the right edge to now, preserving the duration', () => {
			const { state, gestures } = harness();
			gestures.handlePan(-48 * HOUR); // drag left, far into the future

			expect(state.end).toBe(NOW);
			expect(state.start).toBe(NOW - 24 * HOUR);
		});

		it('fires onMove with the applied bounds', () => {
			const onMove = vi.fn();
			const { state, gestures } = harness({ onMove });
			gestures.handlePan(HOUR);
			expect(onMove).toHaveBeenCalledWith(state.start, state.end);
		});

		it('invokes gesture start/end hooks', () => {
			const onGestureStart = vi.fn();
			const onGestureEnd = vi.fn();
			const { gestures } = harness({ onGestureStart, onGestureEnd });
			gestures.handlePanStart();
			gestures.handlePanEnd();
			expect(onGestureStart).toHaveBeenCalledOnce();
			expect(onGestureEnd).toHaveBeenCalledOnce();
		});
	});

	describe('directional prefetch (onPanEnd)', () => {
		it('prefetches behind after panning toward the past', () => {
			const onPanEnd = vi.fn();
			const { state, gestures } = harness({ onPanEnd });
			gestures.handlePan(2 * HOUR); // positive delta → toward the past
			gestures.handlePanEnd();
			expect(onPanEnd).toHaveBeenCalledWith(1, state.start, state.end);
		});

		it('prefetches ahead after panning toward the future while short of now', () => {
			const onPanEnd = vi.fn();
			const { state, gestures } = harness({ onPanEnd });
			gestures.handlePan(-2 * HOUR); // negative delta → toward the future
			gestures.handlePanEnd();
			expect(onPanEnd).toHaveBeenCalledWith(-1, state.start, state.end);
		});

		it('skips the future prefetch when already clamped at now', () => {
			const onPanEnd = vi.fn();
			const { gestures } = harness({ onPanEnd });
			gestures.handlePan(-48 * HOUR); // clamps end to now
			gestures.handlePanEnd();
			expect(onPanEnd).not.toHaveBeenCalled();
		});
	});

	describe('zoom', () => {
		it('anchors the zoom at the given centre (proportion preserved)', () => {
			const { state, gestures } = harness();
			const start = state.start;
			const duration = state.end - state.start;
			const center = start + duration / 4;

			gestures.handleZoom(2, center);

			expect(state.end - state.start).toBe(duration / 2);
			// The centre keeps its 25% screen position
			expect((center - state.start) / (state.end - state.start)).toBeCloseTo(0.25);
		});

		it('clamps the duration to the configured min/max', () => {
			const { state, gestures } = harness({
				minDurationMs: () => 12 * HOUR,
				maxDurationMs: () => 36 * HOUR
			});
			const center = (state.start + state.end) / 2;

			gestures.handleZoom(1000, center); // extreme zoom in
			expect(state.end - state.start).toBe(12 * HOUR);

			gestures.handleZoom(0.0001, center); // extreme zoom out
			expect(state.end - state.start).toBe(36 * HOUR);
		});

		it('leaves the duration unclamped when no limits are configured', () => {
			const { state, gestures } = harness();
			const center = (state.start + state.end) / 2;
			gestures.handleZoom(0.25, center);
			expect(state.end - state.start).toBe(96 * HOUR);
		});

		it('clamps the zoomed viewport to now', () => {
			const { state, gestures } = harness();
			// Anchor at the left edge and zoom out enough that the right edge
			// would pass now
			gestures.handleZoom(0.1, state.start);
			expect(state.end).toBe(NOW);
		});
	});

	describe('button zoom', () => {
		it('zoomIn / zoomOut apply the default 1.5 factor around the centre', () => {
			const { state, gestures } = harness();
			const duration = state.end - state.start;
			const center = (state.start + state.end) / 2;

			gestures.zoomIn();
			expect(state.end - state.start).toBeCloseTo(duration / 1.5);
			expect((state.start + state.end) / 2).toBeCloseTo(center);

			gestures.zoomOut();
			expect(state.end - state.start).toBeCloseTo(duration);
		});
	});
});
