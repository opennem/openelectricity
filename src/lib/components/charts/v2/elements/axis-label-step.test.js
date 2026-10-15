import { describe, expect, it } from 'vitest';
import { axisLabelStep } from './axis-label-step.js';

describe('axisLabelStep', () => {
	it('shows every label when they fit', () => {
		expect(axisLabelStep([0, 100, 200, 300], ['12 Oct', '13 Oct', '14 Oct', '15 Oct'])).toBe(1);
	});

	it('shows every other label when neighbours would touch', () => {
		// "12 Oct" needs about 6 × 5.5 + 10 = 43px; ticks 35px apart.
		expect(axisLabelStep([0, 35, 70, 105], ['12 Oct', '13 Oct', '14 Oct', '15 Oct'])).toBe(2);
	});

	it('steps further on a crowded, narrow plot', () => {
		const positions = Array.from({ length: 30 }, (_, i) => i * 9);
		const labels = positions.map((_, i) => `${i + 1} Sept`);
		expect(axisLabelStep(positions, labels)).toBe(6);
	});

	it('leaves a single tick, or no spacing, alone', () => {
		expect(axisLabelStep([10], ['Mon'])).toBe(1);
		expect(axisLabelStep([10, 10], ['Mon', 'Tue'])).toBe(1);
		expect(axisLabelStep([], [])).toBe(1);
	});
});
