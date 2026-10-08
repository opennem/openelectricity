import { describe, expect, it } from 'vitest';
import {
	benchmarkComparisonRegions,
	benchmarkRankRows,
	rankedRegionOrder,
	isRankableComparisonMetric,
	rankComparisonRows,
	rankedComparisonRegions
} from './comparison-displays.js';

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
	it('ranks the states and WEM, with NEM and All Regions as references', () => {
		const regions = ['vic1', '_all', 'nsw1', 'au', 'wem'];
		expect(rankedComparisonRegions(regions)).toEqual(['vic1', 'nsw1', 'wem']);
		expect(benchmarkComparisonRegions(regions)).toEqual(['_all', 'au']);
		expect(rankedComparisonRegions(['_all'])).toEqual([]);
	});
	it('ranks ratios only, never volumes', () => {
		expect(isRankableComparisonMetric('intensity')).toBe(true);
		expect(isRankableComparisonMetric('renewables_share')).toBe(true);
		expect(isRankableComparisonMetric('price')).toBe(true);
		expect(isRankableComparisonMetric('emissions')).toBe(false);
		expect(isRankableComparisonMetric('solar_generation')).toBe(false);
	});
	it('places references on a tied rank or between the ranks either side', () => {
		const ranked = ['nsw1', 'qld1', 'sa1'];
		const placed = benchmarkRankRows(
			[
				row(0, { nsw1: 30, qld1: 20, sa1: 10, _all: 25, au: 20 }),
				row(1, { nsw1: 30, qld1: 20, sa1: 10, _all: 40, au: 5 }),
				row(2, { nsw1: null, qld1: null, sa1: null, _all: 40, au: null })
			],
			ranked,
			['_all', 'au']
		);
		expect(placed[0]).toMatchObject({ time: 0, _all: 1.5, au: 2 });
		expect(placed[0].labels).toEqual({ _all: '#1–2', au: '#2' });
		expect(placed[1]).toMatchObject({ _all: 0.5, au: 3.5 });
		expect(placed[1].labels).toEqual({ _all: 'above #1', au: 'below #3' });
		// Nothing to place against, or no value of its own.
		expect(placed[2]).toMatchObject({ _all: null, au: null });
		expect(placed[2].labels).toEqual({});
	});
	it('counts only the regions reporting that period', () => {
		// Three selected, one reporting: below it is "below #1", not "#1–2".
		const [placed] = benchmarkRankRows(
			[row(0, { nsw1: 5, qld1: null, vic1: null, au: 3 })],
			['nsw1', 'qld1', 'vic1'],
			['au']
		);
		expect(placed).toMatchObject({ au: 1.5, labels: { au: 'below #1' } });
	});
	it('reads tied ranks as they are drawn', () => {
		// 10, 10, 5 rank #1, #1, #3: a reference at 7 sits between #1 and #3.
		const ranked = ['nsw1', 'qld1', 'vic1'];
		const [between, tied, last] = benchmarkRankRows(
			[
				row(0, { nsw1: 10, qld1: 10, vic1: 5, au: 7 }),
				row(1, { nsw1: 10, qld1: 10, vic1: 5, au: 10 }),
				row(2, { nsw1: 10, qld1: 10, vic1: 10, au: 7 })
			],
			ranked,
			['au']
		);
		expect(between).toMatchObject({ au: 2, labels: { au: '#1–3' } });
		expect(tied).toMatchObject({ au: 1, labels: { au: '#1' } });
		expect(last).toMatchObject({ au: 1.5, labels: { au: 'below #1' } });
	});
	describe('the Regions table in rank order', () => {
		const order = ['au', '_all', 'nsw1', 'qld1', 'sa1', 'tas1', 'vic1', 'wem'];
		/** @param {Record<string, number | null>} values */
		const at = (values) => (/** @type {string} */ id) => values[id] ?? null;

		it('ranks the states, slots NEM in by its line, then the rest', () => {
			const selected = ['_all', 'nsw1', 'qld1', 'tas1', 'vic1'];
			expect(
				rankedRegionOrder(
					order,
					selected,
					at({ nsw1: 28, qld1: 30, tas1: 98, vic1: null, _all: 36 })
				)
			).toEqual(['tas1', '_all', 'qld1', 'nsw1', 'vic1', 'au', 'sa1', 'wem']);
		});

		it('keeps the list order with nothing to rank', () => {
			expect(rankedRegionOrder(order, ['_all'], at({ _all: 36 }))).toEqual(order);
		});

		it('keeps ties in list order, with a tied reference after them', () => {
			expect(
				rankedRegionOrder(
					order,
					['_all', 'nsw1', 'qld1', 'sa1'],
					at({ nsw1: 10, qld1: 5, sa1: 10, _all: 10 })
				)
			).toEqual(['nsw1', 'sa1', '_all', 'qld1', 'au', 'tas1', 'vic1', 'wem']);
		});
	});
});
