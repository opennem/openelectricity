import { describe, expect, it } from 'vitest';
import growth, { growthComparison } from './growth';

/** @param {number} time @param {Record<string, number | null>} values */
const row = (time, values) => ({ time, date: new Date(time), ...values });

describe('growthComparison', () => {
	it('compares plain grains with the previous bucket', () => {
		expect(growthComparison('1M')).toMatchObject({ lag: 1, label: 'month-on-month' });
		expect(growthComparison('1d')).toMatchObject({ lag: 1, label: 'day-on-day' });
		expect(growthComparison('half')).toMatchObject({ lag: 1, label: 'half-year-on-half-year' });
		expect(growthComparison('fy')).toMatchObject({ lag: 1, label: 'year-on-year' });
	});

	it('compares rolling windows with the window a year earlier', () => {
		expect(growthComparison('12mr')).toMatchObject({ lag: 12, label: 'year-on-year' });
		expect(growthComparison('12mr-season')).toMatchObject({ lag: 4 });
		expect(growthComparison('12mr-quarter')).toMatchObject({ lag: 4 });
		expect(growthComparison('12mr-half')).toMatchObject({ lag: 2 });
	});

	it('compares filtered rows, already a year apart, with the row before', () => {
		expect(growthComparison('1M', { filtered: true })).toMatchObject({
			lag: 1,
			label: 'year-on-year'
		});
		expect(growthComparison('12mr', { filtered: true })).toMatchObject({ lag: 1 });
	});

	it('is not offered at power grains', () => {
		expect(growthComparison('5m')).toBeNull();
		expect(growthComparison('30m')).toBeNull();
	});

	it('looks back far enough for the compared rows', () => {
		const day = 24 * 60 * 60 * 1000;
		expect(growthComparison('1M')?.leadInMs).toBeGreaterThanOrEqual(31 * day);
		expect(growthComparison('12mr')?.leadInMs).toBeGreaterThanOrEqual(366 * day);
	});
});

describe('growth', () => {
	it('subtracts the compared row per series, signed', () => {
		const rows = [row(1, { coal: 100, wind: 10 }), row(2, { coal: 80, wind: 30 })];
		expect(growth(rows, ['coal', 'wind'], 1)).toEqual([
			row(1, { coal: null, wind: null }),
			row(2, { coal: -20, wind: 20 })
		]);
	});

	it('compares the first visible rows with the lead-in', () => {
		const leadIn = [row(0, { coal: 90 })];
		expect(growth([row(1, { coal: 100 })], ['coal'], 1, leadIn)).toEqual([row(1, { coal: 10 })]);
	});

	it('reaches back `lag` rows across the lead-in', () => {
		const leadIn = [row(0, { coal: 50 }), row(1, { coal: 60 })];
		const rows = [row(2, { coal: 70 }), row(3, { coal: 90 })];
		expect(growth(rows, ['coal'], 2, leadIn).map((d) => d.coal)).toEqual([20, 30]);
	});

	it('leaves gaps where either value is missing', () => {
		const rows = [row(1, { coal: 100 }), row(2, { coal: null }), row(3, { coal: 120 })];
		expect(growth(rows, ['coal'], 1).map((d) => d.coal)).toEqual([null, null, null]);
	});

	it('repeats the last growth row for a closing band row', () => {
		const rows = [
			row(1, { coal: 100 }),
			row(2, { coal: 130 }),
			{ ...row(3, { coal: 130 }), _bandClose: true }
		];
		const result = growth(rows, ['coal'], 1);
		expect(result[2]).toMatchObject({ time: 3, coal: 30, _bandClose: true });
	});

	it('ignores closing rows in the lead-in', () => {
		const leadIn = [row(0, { coal: 50 }), { ...row(0.5, { coal: 50 }), _bandClose: true }];
		expect(growth([row(1, { coal: 70 })], ['coal'], 1, leadIn)[0].coal).toBe(20);
	});
});
