import { describe, it, expect } from 'vitest';
import {
	toDateValue,
	rectDefaults,
	circleDefaults,
	lineDefaults,
	textDefaults,
	textTransform
} from './annotations-helpers.js';

describe('toDateValue', () => {
	it('returns the same Date when given a Date', () => {
		const d = new Date('2025-01-01');
		expect(toDateValue(d)).toBe(d);
	});

	it('converts a numeric timestamp to a Date', () => {
		const ts = new Date('2025-06-15').getTime();
		const result = toDateValue(ts);
		expect(result).toBeInstanceOf(Date);
		expect(result.getTime()).toBe(ts);
	});
});

describe('rectDefaults', () => {
	it('applies all defaults when no optional props provided', () => {
		const item = /** @type {any} */ ({ type: 'rect', x: 0, y: 0, width: 10, height: 10 });
		const result = rectDefaults(item);
		expect(result).toEqual({
			fill: 'none',
			stroke: 'none',
			strokeWidth: 1,
			opacity: 1,
			rx: 0
		});
	});

	it('preserves explicitly set values', () => {
		const item = /** @type {any} */ ({
			type: 'rect', x: 0, y: 0, width: 10, height: 10,
			fill: 'red', stroke: 'blue', strokeWidth: 3, opacity: 0.5, rx: 8
		});
		const result = rectDefaults(item);
		expect(result).toEqual({
			fill: 'red',
			stroke: 'blue',
			strokeWidth: 3,
			opacity: 0.5,
			rx: 8
		});
	});
});

describe('circleDefaults', () => {
	it('applies all defaults when no optional props provided', () => {
		const item = /** @type {any} */ ({ type: 'circle', x: 0, y: 0, r: 5 });
		const result = circleDefaults(item);
		expect(result).toEqual({
			fill: 'none',
			stroke: 'none',
			strokeWidth: 1,
			opacity: 1
		});
	});

	it('preserves explicitly set values', () => {
		const item = /** @type {any} */ ({
			type: 'circle', x: 0, y: 0, r: 5,
			fill: '#C74523', stroke: '#000', strokeWidth: 2, opacity: 0.8
		});
		const result = circleDefaults(item);
		expect(result).toEqual({
			fill: '#C74523',
			stroke: '#000',
			strokeWidth: 2,
			opacity: 0.8
		});
	});
});

describe('lineDefaults', () => {
	it('applies all defaults when no optional props provided', () => {
		const item = /** @type {any} */ ({ type: 'line', x1: 0, y1: 0, x2: 100, y2: 100 });
		const result = lineDefaults(item);
		expect(result).toEqual({
			stroke: '#666',
			strokeWidth: 1,
			strokeDasharray: 'none',
			opacity: 1
		});
	});

	it('preserves explicitly set values', () => {
		const item = /** @type {any} */ ({
			type: 'line', x1: 0, y1: 0, x2: 100, y2: 100,
			stroke: 'red', strokeWidth: 2, strokeDasharray: '4,4', opacity: 0.6
		});
		const result = lineDefaults(item);
		expect(result).toEqual({
			stroke: 'red',
			strokeWidth: 2,
			strokeDasharray: '4,4',
			opacity: 0.6
		});
	});
});

describe('textDefaults', () => {
	it('applies all defaults when no optional props provided', () => {
		const item = /** @type {any} */ ({ type: 'text', x: 0, y: 0, text: 'hello' });
		const result = textDefaults(item);
		expect(result).toEqual({
			dx: 0,
			dy: 0,
			fill: '#333',
			fontSize: '12px',
			fontWeight: 'normal',
			textAnchor: 'start',
			dominantBaseline: 'auto',
			opacity: 1
		});
	});

	it('preserves explicitly set values', () => {
		const item = /** @type {any} */ ({
			type: 'text', x: 0, y: 0, text: 'hello',
			dx: 5, dy: -3, fill: 'white', fontSize: '14px',
			fontWeight: 'bold', textAnchor: 'middle',
			dominantBaseline: 'central', opacity: 0.9
		});
		const result = textDefaults(item);
		expect(result).toEqual({
			dx: 5,
			dy: -3,
			fill: 'white',
			fontSize: '14px',
			fontWeight: 'bold',
			textAnchor: 'middle',
			dominantBaseline: 'central',
			opacity: 0.9
		});
	});
});

describe('textTransform', () => {
	it('returns undefined when no rotation is set', () => {
		const item = /** @type {any} */ ({ type: 'text', x: 0, y: 0, text: 'hello' });
		expect(textTransform(item, 100, 200)).toBeUndefined();
	});

	it('returns undefined when rotation is 0', () => {
		const item = /** @type {any} */ ({ type: 'text', x: 0, y: 0, text: 'hello', rotate: 0 });
		expect(textTransform(item, 100, 200)).toBeUndefined();
	});

	it('returns rotate transform string with correct coordinates', () => {
		const item = /** @type {any} */ ({ type: 'text', x: 0, y: 0, text: 'hello', rotate: -45 });
		expect(textTransform(item, 100, 200)).toBe('rotate(-45, 100, 200)');
	});

	it('handles positive rotation', () => {
		const item = /** @type {any} */ ({ type: 'text', x: 0, y: 0, text: 'hello', rotate: 90 });
		expect(textTransform(item, 50, 75)).toBe('rotate(90, 50, 75)');
	});
});
