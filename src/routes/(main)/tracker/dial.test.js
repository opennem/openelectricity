import { describe, expect, it } from 'vitest';
import { dialAngle, dialUnit, dialValue, meanOfHours } from './dial.js';

describe('dialAngle', () => {
	it('puts noon at the top and midnight at the bottom, clockwise', () => {
		expect(dialAngle(12) % (2 * Math.PI)).toBeCloseTo(0);
		// 18:00 at the right: a quarter turn clockwise from the top.
		expect(dialAngle(18) % (2 * Math.PI)).toBeCloseTo(0.5 * Math.PI);
		expect(dialAngle(0)).toBeCloseTo(Math.PI);
	});
});

describe('dial values', () => {
	it('leads prices with $ and cents, keeping the per-quantity tail as the unit', () => {
		expect(dialValue(85.3, '$/MWh')).toEqual({ value: '$85.30', unit: '/MWh' });
		expect(dialValue(-60.25, '$/MWh').value).toBe('$-60.25');
		expect(dialUnit('$/MWh')).toBe('/MWh');
	});

	it('trails other units after a one-decimal number', () => {
		expect(dialValue(18288.14, 'MW')).toEqual({ value: '18,288.1', unit: 'MW' });
		expect(dialUnit('MW')).toBe('MW');
	});
});

describe('meanOfHours', () => {
	it('averages the hours with a value, skipping the empty ones', () => {
		expect(meanOfHours([{ average: 100 }, { average: null }, { average: 200 }])).toBe(150);
	});
	it('is null when no hour has a value', () => {
		expect(meanOfHours([{ average: null }])).toBeNull();
		expect(meanOfHours([])).toBeNull();
	});
});
