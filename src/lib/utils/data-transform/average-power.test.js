import { describe, expect, it } from 'vitest';
import averagePower from './average-power';

/**
 * @param {number} time @param {Record<string, number | null>} values
 * @returns {import('./average-power.js').AveragePowerRow}
 */
const row = (time, values) => ({ time, ...values });

describe('averagePower', () => {
	it('divides each bucket by its own hours', () => {
		const hours = /** @type {Record<number, number>} */ ({ 1: 28 * 24, 2: 31 * 24 });
		const rows = [row(1, { coal: 672_000, wind: 6720 }), row(2, { coal: 744_000, wind: null })];
		expect(averagePower(rows, ['coal', 'wind'], (d) => hours[d.time])).toEqual([
			row(1, { coal: 1000, wind: 10 }),
			row(2, { coal: 1000, wind: null })
		]);
	});

	it('leaves keys it was not given alone', () => {
		expect(averagePower([row(1, { coal: 48, share: 40 })], ['coal'], () => 24)).toEqual([
			row(1, { coal: 2, share: 40 })
		]);
	});

	it('uses the bucket before for a closing band row', () => {
		const rows = [row(1, { coal: 240 }), { ...row(2, { coal: 240 }), _bandClose: true }];
		const result = averagePower(rows, ['coal'], (d) => (d.time === 1 ? 24 : 1));
		expect(result.map((d) => d.coal)).toEqual([10, 10]);
		expect(result[1]._bandClose).toBe(true);
	});

	it('leaves gaps for buckets without hours', () => {
		expect(averagePower([row(1, { coal: 10 })], ['coal'], () => 0)[0].coal).toBeNull();
	});
});
