import { describe, expect, it } from 'vitest';
import {
	derivePairwiseFlows,
	toLegacyPayload,
	collectRegionSeriesAligned,
	trimToLastCompleteRow
} from './derive-pairwise.js';

const T1 = '2026-07-24T14:20:00+10:00';
const T2 = '2026-07-24T14:25:00+10:00';

/** @param {string} metric @param {Record<string, [string, number][]>} byRegion */
const metricEntry = (metric, byRegion) => ({
	metric,
	results: Object.entries(byRegion).map(([region, data]) => ({
		name: `${metric}_${region}`,
		columns: { region },
		data
	}))
});

/** Live-sample fixture: QLD exporting 1028.6 to NSW, VIC exporting 712.5 to SA,
 *  TAS exporting 217.9 to VIC, NSW exporting 232.6 to VIC. */
const liveSample = [
	metricEntry('flow_imports', {
		NSW1: [[T2, 1028.59766]],
		QLD1: [[T2, 0]],
		SA1: [[T2, 712.50879]],
		TAS1: [[T2, 0]],
		VIC1: [[T2, 450.53252]]
	}),
	metricEntry('flow_exports', {
		NSW1: [[T2, 232.63408]],
		QLD1: [[T2, 1028.59766]],
		SA1: [[T2, 0]],
		TAS1: [[T2, 217.89844]],
		VIC1: [[T2, 712.50879]]
	})
];

describe('derivePairwiseFlows', () => {
	it('reproduces the corridor flows from the live sample exactly', () => {
		const { timestamps, series } = derivePairwiseFlows(liveSample);

		expect(timestamps).toEqual([T2]);
		// QLD exporting → NSW1->QLD1 negative (flow runs QLD→NSW)
		expect(series['NSW1->QLD1'][0]).toBeCloseTo(-1028.59766, 4);
		// SA importing → SA1->VIC1 negative (flow runs VIC→SA)
		expect(series['SA1->VIC1'][0]).toBeCloseTo(-712.50879, 4);
		// TAS exporting → TAS1->VIC1 positive
		expect(series['TAS1->VIC1'][0]).toBeCloseTo(217.89844, 4);
		// NSW's exports all went to VIC
		expect(series['NSW1->VIC1'][0]).toBeCloseTo(232.63408, 4);
	});

	it('nulls derived samples when a dependent region misses the timestamp', () => {
		const partial = [
			metricEntry('flow_imports', { QLD1: [[T1, 100]], VIC1: [[T1, 50]] }),
			metricEntry('flow_exports', { QLD1: [[T1, 0]], VIC1: [[T1, 0]] })
		];
		const { series } = derivePairwiseFlows(partial);

		expect(series['NSW1->QLD1'][0]).toBe(100);
		// SA1/TAS1 absent → their corridors and the VNI derivation are null
		expect(series['SA1->VIC1'][0]).toBeNull();
		expect(series['TAS1->VIC1'][0]).toBeNull();
		expect(series['NSW1->VIC1'][0]).toBeNull();
	});

	it('sorts union timestamps ascending', () => {
		const twoStep = [
			metricEntry('flow_imports', {
				QLD1: [
					[T2, 10],
					[T1, 20]
				]
			}),
			metricEntry('flow_exports', {
				QLD1: [
					[T2, 0],
					[T1, 0]
				]
			})
		];
		const { timestamps, series } = derivePairwiseFlows(twoStep);
		expect(timestamps).toEqual([T1, T2]);
		expect(series['NSW1->QLD1']).toEqual([20, 10]);
	});
});

describe('toLegacyPayload', () => {
	it('shapes series into the legacy stats payload', () => {
		const { timestamps, series } = derivePairwiseFlows(liveSample);
		const payload = toLegacyPayload(timestamps, series);

		expect(payload.data).toHaveLength(4);
		const qni = payload.data.find((d) => d.code === 'NSW1->QLD1');
		expect(qni?.history.last).toBe(T2);
		expect(qni?.history.interval).toBe('5m');
		expect(qni?.history.data[0]).toBeCloseTo(-1028.59766, 4);
	});

	it('returns the empty shape for no timestamps', () => {
		expect(toLegacyPayload([], {})).toEqual({ data: [] });
	});
});

describe('trimToLastCompleteRow', () => {
	it('drops trailing rows until every series has a value', () => {
		const trimmed = trimToLastCompleteRow([T1, T2], { a: [1, 2], b: [3, null] });
		expect(trimmed.timestamps).toEqual([T1]);
		expect(trimmed.series).toEqual({ a: [1], b: [3] });
	});

	it('keeps interior nulls and complete tails untouched', () => {
		const input = { a: [null, 2], b: [3, 4] };
		const trimmed = trimToLastCompleteRow([T1, T2], input);
		expect(trimmed.timestamps).toEqual([T1, T2]);
		expect(trimmed.series).toBe(input);
	});

	it('returns input unchanged when no complete row exists', () => {
		const trimmed = trimToLastCompleteRow([T1], { a: [null], b: [1] });
		expect(trimmed.timestamps).toEqual([T1]);
	});
});

describe('collectRegionSeriesAligned', () => {
	it('aligns per-region price series onto the union timestamps', () => {
		const prices = [
			metricEntry('price', {
				NSW1: [
					[T1, 104.5],
					[T2, 98.2]
				],
				SA1: [[T2, -32.1]]
			})
		];
		const { timestamps, series } = collectRegionSeriesAligned(prices, 'price');

		expect(timestamps).toEqual([T1, T2]);
		expect(series.NSW1).toEqual([104.5, 98.2]);
		expect(series.SA1).toEqual([null, -32.1]);
	});
});
