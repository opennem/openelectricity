import { describe, it, expect } from 'vitest';
import { computeYearBounds, computePlayYearBounds } from './year-bounds.js';

/**
 * @param {string} code
 * @param {any[]} units
 */
function facility(code, units) {
	return { code, name: code, units };
}

const facilities = [
	facility('OLD_COAL', [
		{ status_id: 'retired', commencement_date: '1971-01-01', closure_date: '2017-01-01' }
	]),
	facility('NEW_SOLAR', [{ status_id: 'operating', commencement_date: '2022-01-01' }])
];

describe('computeYearBounds', () => {
	it('falls back to the historic range when facilities are missing or dateless', () => {
		expect(computeYearBounds(null)).toEqual({ min: 1900, max: 2040 });
		expect(computeYearBounds([])).toEqual({ min: 1900, max: 2040 });
		expect(computeYearBounds([facility('X', [{ status_id: 'operating' }])])).toEqual({
			min: 1900,
			max: 2040
		});
	});

	it('uses status-appropriate dates (closure year for retired units)', () => {
		expect(computeYearBounds(facilities)).toEqual({ min: 2017, max: 2022 });
	});
});

describe('computePlayYearBounds', () => {
	it('uses commencement years, extending to committed expected operation years', () => {
		expect(computePlayYearBounds(facilities)).toEqual({ min: 1971, max: 2022 });
		const withCommitted = [
			...facilities,
			facility('PLANNED', [{ status_id: 'committed', expected_operation_date: '2028-01-01' }])
		];
		expect(computePlayYearBounds(withCommitted)).toEqual({ min: 1971, max: 2028 });
	});

	it('ignores units without a usable date', () => {
		const withDateless = [...facilities, facility('NO_DATES', [{ status_id: 'operating' }])];
		expect(computePlayYearBounds(withDateless)).toEqual({ min: 1971, max: 2022 });
	});
});
