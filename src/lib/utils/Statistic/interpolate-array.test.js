import { describe, expect, it } from 'vitest';
import interpolate from '$lib/utils/Statistic/interpolate-array';

describe('Test data interpolation between data points', () => {
	it('returns the original data if the ratio is target interval is 0', () => {
		expect(interpolate([1, 2], 1, 0)).toStrictEqual([1, 2]);
	});

	it("returns the orginal data if the input array's length is 1", () => {
		expect(interpolate([1], 30, 5)).toStrictEqual([1]);
	});

	it('interpolates increasing values', () => {
		expect(interpolate([1, 2], 1, 0.5)).toMatchInlineSnapshot(`
          [
            1,
            1.5,
            2,
          ]
        `);
	});

	it('interpolates increasing and decreasing values', () => {
		expect(interpolate([1, 2, 1], 3, 1)).toMatchInlineSnapshot(`
          [
            1,
            1.3333333333333335,
            1.6666666666666665,
            2,
            1.6666666666666667,
            1.3333333333333335,
            1,
          ]
        `);
	});

	it('interpolates increasing and decreasing with negative values', () => {
		expect(interpolate([-1, 2, 10, -10], 1, 0.5)).toMatchInlineSnapshot(`
          [
            -1,
            0.5,
            2,
            6,
            10,
            0,
            -10,
          ]
        `);
	});

	it('interopolates decimal inputs', () => {
		expect(interpolate([0.124, 0.444, 0.537, 0.111], 30, 5)).toMatchInlineSnapshot(`
          [
            0.124,
            0.17733333333333334,
            0.2306666666666667,
            0.28400000000000003,
            0.3373333333333333,
            0.39066666666666666,
            0.444,
            0.4595,
            0.47500000000000003,
            0.49050000000000005,
            0.506,
            0.5215000000000001,
            0.537,
            0.4660000000000001,
            0.395,
            0.324,
            0.253,
            0.182,
            0.111,
          ]
        `);
	});
});
