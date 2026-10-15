import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	classifyTouchDrag,
	createEmulatedMouseGuard,
	EMULATED_MOUSE_MS,
	TAP_THRESHOLD
} from './touch-gesture.js';

describe('classifyTouchDrag', () => {
	it('stays a tap within the threshold', () => {
		expect(classifyTouchDrag(0, 0)).toBe('pending');
		expect(classifyTouchDrag(TAP_THRESHOLD - 1, -(TAP_THRESHOLD - 1))).toBe('pending');
	});

	it('scrubs a mostly horizontal drag', () => {
		expect(classifyTouchDrag(20, 5)).toBe('scrub');
		expect(classifyTouchDrag(-TAP_THRESHOLD, 0)).toBe('scrub');
	});

	it('leaves a mostly vertical drag to the page scroll', () => {
		expect(classifyTouchDrag(5, 20)).toBe('scroll');
		expect(classifyTouchDrag(10, -10)).toBe('scroll');
	});
});

describe('createEmulatedMouseGuard', () => {
	afterEach(() => vi.useRealTimers());

	it('covers the emulated mouse events just after a touch', () => {
		vi.useFakeTimers();
		const guard = createEmulatedMouseGuard();
		expect(guard.active).toBe(false);
		guard.touchEnded();
		expect(guard.active).toBe(true);
		vi.advanceTimersByTime(EMULATED_MOUSE_MS);
		expect(guard.active).toBe(false);
	});
});
