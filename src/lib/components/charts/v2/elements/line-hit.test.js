import { describe, expect, it } from 'vitest';
import { nearestLine } from './line-hit.js';

const lines = [
	{ key: 'a', values: [0, 1, 2].map((time) => ({ time, value: 10 })) },
	{ key: 'b', values: [0, 1, 2].map((time) => ({ time, value: time === 1 ? null : 20 })) },
	{ key: 'c', values: [0, 1, 2].map((time) => ({ time, value: 21 })) }
];
const yOf = (/** @type {{ value: number | null }} */ point) => 100 - Number(point.value);

describe('nearestLine', () => {
	it('names the line nearest the pointer within half the hit width', () => {
		expect(nearestLine(lines, 0, 90, yOf, 10)).toBe('a');
		expect(nearestLine(lines, 0, 86, yOf, 10)).toBe('a');
		expect(nearestLine(lines, 0, 96, yOf, 10)).toBeUndefined();
	});
	it('skips a line with no value at the time', () => {
		expect(nearestLine(lines, 1, 80, yOf, 10)).toBe('c');
	});
	it('prefers the line drawn last where lines overlap', () => {
		expect(nearestLine(lines, 0, 79.5, yOf, 10)).toBe('c');
		const overlap = [lines[0], { key: 'top', values: lines[0].values }];
		expect(nearestLine(overlap, 2, 90, yOf, 10)).toBe('top');
	});
});
