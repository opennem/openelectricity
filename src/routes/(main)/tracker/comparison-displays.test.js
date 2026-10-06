import { describe, expect, it } from 'vitest';
import { rankComparisonRows } from './comparison-displays.js';

const row = (/** @type {number} */ time, /** @type {Record<string, any>} */ values) => ({
	date: new Date(time),
	time,
	...values
});

describe('comparison displays', () => {
	it('ranks regions per period, 1 for the highest, ties sharing a rank and gaps unranked', () => {
		const regions = ['nsw1', 'qld1', 'sa1', 'wem'];
		const ranked = rankComparisonRows(
			[
				row(0, { nsw1: 10, qld1: 30, sa1: 20, wem: 5 }),
				row(1, { nsw1: 20, qld1: 30, sa1: 20, wem: 5 }),
				row(2, { nsw1: -4, qld1: null, sa1: 0, wem: undefined })
			],
			regions
		);
		expect(ranked[0]).toMatchObject({ time: 0, nsw1: 3, qld1: 1, sa1: 2, wem: 4 });
		// Tied regions share a rank and the next one skips it.
		expect(ranked[1]).toMatchObject({ nsw1: 2, qld1: 1, sa1: 2, wem: 4 });
		// Only regions with a value are counted, and the rest stay unranked.
		expect(ranked[2]).toMatchObject({ nsw1: 2, qld1: null, sa1: 1, wem: null });
		expect(ranked[2].date).toEqual(new Date(2));
	});
	it('keeps rows without values as empty periods', () => {
		expect(rankComparisonRows([row(5, { nsw1: null })], ['nsw1'])).toEqual([
			{ date: new Date(5), time: 5, nsw1: null }
		]);
		expect(rankComparisonRows([], ['nsw1'])).toEqual([]);
	});
});
