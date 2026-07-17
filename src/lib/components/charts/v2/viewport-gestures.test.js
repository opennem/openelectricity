import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createViewportGestures, isViewportPinned } from './viewport-gestures.js';

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

	describe('minDateMs floor', () => {
		const FLOOR = NOW - 200 * HOUR;

		it('clamps a pan into the past at the floor, preserving the duration', () => {
			const { state, gestures } = harness({ minDateMs: () => FLOOR });
			gestures.handlePan(1000 * HOUR); // drag far into the past

			expect(state.start).toBe(FLOOR);
			expect(state.end - state.start).toBe(24 * HOUR);
		});

		it('shrinks an oversized viewport to [floor, now] when panning', () => {
			const state = { start: NOW - 500 * HOUR, end: NOW - 100 * HOUR }; // 400h > now - floor
			const gestures = createViewportGestures({
				viewport: () => ({ ...state }),
				apply: (start, end) => {
					state.start = start;
					state.end = end;
				},
				minDateMs: () => FLOOR
			});

			gestures.handlePan(HOUR); // any pan toward the past
			expect(state.start).toBe(FLOOR);
			expect(state.end).toBe(NOW);
		});

		it('caps zoom-out duration at now - floor even when maxDurationMs allows more', () => {
			const { state, gestures } = harness({
				minDateMs: () => FLOOR,
				maxDurationMs: () => 10_000 * HOUR
			});
			const center = (state.start + state.end) / 2;

			gestures.handleZoom(0.0001, center); // extreme zoom out
			expect(state.start).toBe(FLOOR);
			expect(state.end).toBe(NOW);
		});

		it('clamps a zoom-out anchored near the floor to the floor', () => {
			const state = { start: FLOOR, end: FLOOR + 24 * HOUR };
			const gestures = createViewportGestures({
				viewport: () => ({ ...state }),
				apply: (start, end) => {
					state.start = start;
					state.end = end;
				},
				minDateMs: () => FLOOR
			});

			gestures.handleZoom(0.5, state.start); // anchor at the left edge
			expect(state.start).toBe(FLOOR);
			expect(state.end - state.start).toBe(48 * HOUR);
		});

		it('does not clamp when minDateMs is omitted', () => {
			const { state, gestures } = harness();
			gestures.handlePan(1000 * HOUR);
			expect(state.start).toBe(NOW - 48 * HOUR - 1000 * HOUR);
		});

		it('isViewportPinned detects the fully-clamped [floor, now] state', () => {
			expect(isViewportPinned(FLOOR, NOW, FLOOR)).toBe(true);
			// Tolerance absorbs wall-clock drift between clamp and evaluation.
			expect(isViewportPinned(FLOOR, NOW - 30 * 1000, FLOOR)).toBe(true);
			// Not pinned when either edge is short of its bound.
			expect(isViewportPinned(FLOOR + HOUR, NOW, FLOOR)).toBe(false);
			expect(isViewportPinned(FLOOR, NOW - 2 * HOUR, FLOOR)).toBe(false);
		});
	});

	describe('settle (onSettle)', () => {
		it('a drag pan settles once, synchronously on pan end', () => {
			const onSettle = vi.fn();
			const { state, gestures } = harness({ onSettle });

			gestures.handlePanStart();
			gestures.handlePan(HOUR);
			gestures.handlePan(HOUR);
			expect(onSettle).not.toHaveBeenCalled();

			gestures.handlePanEnd();
			expect(onSettle).toHaveBeenCalledExactlyOnceWith(state.start, state.end);

			// No trailing timer-driven repeat.
			vi.advanceTimersByTime(1000);
			expect(onSettle).toHaveBeenCalledOnce();
		});

		it('a wheel-zoom stream settles once after the lull', () => {
			const onSettle = vi.fn();
			const { state, gestures } = harness({ onSettle });
			const center = (state.start + state.end) / 2;

			// No pointer gesture — wheel steps only.
			gestures.handleZoom(1.1, center);
			vi.advanceTimersByTime(100);
			gestures.handleZoom(1.1, center); // resets the lull timer
			vi.advanceTimersByTime(150);
			expect(onSettle).not.toHaveBeenCalled();

			vi.advanceTimersByTime(50); // 200ms since the last step
			expect(onSettle).toHaveBeenCalledExactlyOnceWith(state.start, state.end);
		});

		it('a wheel pan settles via the earlier onpanend instead of the lull timer', () => {
			const onSettle = vi.fn();
			const { state, gestures } = harness({ onSettle });

			// Wheel pans arrive without handlePanStart; InteractionLayer fires
			// onpanend 150ms after the stream stops — before the 200ms lull.
			gestures.handlePan(HOUR);
			gestures.handlePanEnd();
			expect(onSettle).toHaveBeenCalledExactlyOnceWith(state.start, state.end);

			vi.advanceTimersByTime(1000);
			expect(onSettle).toHaveBeenCalledOnce();
		});

		it('starting a pointer gesture cancels a pending wheel settle', () => {
			const onSettle = vi.fn();
			const { gestures } = harness({ onSettle });
			const center = NOW - 36 * HOUR;

			gestures.handleZoom(1.1, center);
			vi.advanceTimersByTime(100);
			gestures.handlePanStart(); // new gesture before the lull elapses
			vi.advanceTimersByTime(1000);
			expect(onSettle).not.toHaveBeenCalled();

			// The combined gesture still settles once, on release.
			gestures.handlePan(HOUR);
			gestures.handlePanEnd();
			expect(onSettle).toHaveBeenCalledOnce();
		});

		it('button zooms settle synchronously with the clamped viewport', () => {
			const onSettle = vi.fn();
			const { state, gestures } = harness({
				onSettle,
				minDurationMs: () => 30 * HOUR // 24h viewport → zoomIn clamps to 30h
			});

			gestures.zoomIn();
			expect(onSettle).toHaveBeenCalledExactlyOnceWith(state.start, state.end);
			expect(state.end - state.start).toBe(30 * HOUR);
		});

		it('settles with the applied viewport even when apply does not write back', () => {
			// Provider charts forward apply to a parent — viewport() stays stale
			// within the synchronous gesture. Settle must report the applied value.
			const onSettle = vi.fn();
			const fixed = { start: NOW - 48 * HOUR, end: NOW - 24 * HOUR };
			const gestures = createViewportGestures({
				viewport: () => ({ ...fixed }),
				apply: () => {},
				onSettle
			});

			gestures.handlePanStart();
			gestures.handlePan(2 * HOUR);
			gestures.handlePanEnd();
			expect(onSettle).toHaveBeenCalledExactlyOnceWith(
				fixed.start - 2 * HOUR,
				fixed.end - 2 * HOUR
			);
		});

		it('a gesture that moved nothing does not settle', () => {
			const onSettle = vi.fn();
			const { gestures } = harness({ onSettle });
			gestures.handlePanStart();
			gestures.handlePanEnd();
			expect(onSettle).not.toHaveBeenCalled();
		});

		it('dispose cancels a pending settle', () => {
			const onSettle = vi.fn();
			const { gestures } = harness({ onSettle });
			gestures.handleZoom(1.1, NOW - 36 * HOUR);
			gestures.dispose();
			vi.advanceTimersByTime(1000);
			expect(onSettle).not.toHaveBeenCalled();
		});
	});
});
