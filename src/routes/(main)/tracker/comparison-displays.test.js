import { describe, expect, it } from 'vitest';
import {
	benchmarkComparisonRegions,
	benchmarkRankRows,
	formatBenchmarkRank,
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
		expect(placed[1]).toMatchObject({ _all: 0.5, au: 3.5 });
		// Nothing to place against, or no value of its own.
		expect(placed[2]).toMatchObject({ _all: null, au: null });
	});
	it('reads a reference place as a rank, a range or an end', () => {
		expect(formatBenchmarkRank(2, 6)).toBe('#2');
		expect(formatBenchmarkRank(2.5, 6)).toBe('#2–3');
		expect(formatBenchmarkRank(0.5, 6)).toBe('above #1');
		expect(formatBenchmarkRank(6.5, 6)).toBe('below #6');
	});
});
