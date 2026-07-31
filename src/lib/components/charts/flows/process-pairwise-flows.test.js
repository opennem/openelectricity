import { describe, expect, it } from 'vitest';
import { processPairwiseFlows } from './process-pairwise-flows.js';

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

const flowsResponse = {
	data: [
		metricEntry('flow_imports', {
			NSW1: [[T1, 1000]],
			QLD1: [[T1, 0]],
			SA1: [[T1, 700]],
			TAS1: [[T1, 0]],
			VIC1: [[T1, 450]]
		}),
		metricEntry('flow_exports', {
			NSW1: [[T1, 230]],
			QLD1: [[T1, 1000]],
			SA1: [[T1, 0]],
			TAS1: [[T1, 220]],
			VIC1: [[T1, 700]]
		})
	]
};

describe('processPairwiseFlows', () => {
	it('emits all four corridor series as chart rows', () => {
		const result = processPairwiseFlows(flowsResponse);

		expect(result).not.toBeNull();
		expect(result?.seriesNames).toEqual(['NSW1->QLD1', 'NSW1->VIC1', 'SA1->VIC1', 'TAS1->VIC1']);
		expect(result?.data).toHaveLength(1);

		const row = result?.data[0];
		expect(row.time).toBe(new Date(T1).getTime());
		expect(row.date).toBeInstanceOf(Date);
		expect(row['NSW1->QLD1']).toBe(-1000);
		expect(row['SA1->VIC1']).toBe(-700);
		expect(row['TAS1->VIC1']).toBe(220);
		expect(row['NSW1->VIC1']).toBe(230);
	});

	it('labels corridors with their interconnector names', () => {
		const result = processPairwiseFlows(flowsResponse);
		expect(result?.seriesLabels['NSW1->QLD1']).toBe('QNI (NSW–QLD)');
		expect(result?.seriesLabels['TAS1->VIC1']).toBe('Basslink (TAS–VIC)');
	});

	it('reads the energy metric pair for flows_energy', () => {
		const energyResponse = {
			data: [
				metricEntry('flow_imports_energy', { QLD1: [[T2, 90]] }),
				metricEntry('flow_exports_energy', { QLD1: [[T2, 15]] })
			]
		};
		const result = processPairwiseFlows(energyResponse, { metricFilter: 'flows_energy' });
		expect(result?.data[0]['NSW1->QLD1']).toBe(75);
	});

	it('keeps trailing incomplete rows as nulls (no snapshot trimming)', () => {
		const lagging = {
			data: [
				metricEntry('flow_imports', {
					QLD1: [
						[T1, 100],
						[T2, 120]
					],
					SA1: [[T1, 50]],
					TAS1: [[T1, 0]],
					VIC1: [[T1, 30]]
				}),
				metricEntry('flow_exports', {
					QLD1: [
						[T1, 0],
						[T2, 0]
					],
					SA1: [[T1, 0]],
					TAS1: [[T1, 10]],
					VIC1: [[T1, 60]]
				})
			]
		};
		const result = processPairwiseFlows(lagging);
		expect(result?.data).toHaveLength(2);
		expect(result?.data[1]['NSW1->QLD1']).toBe(120);
		expect(result?.data[1]['SA1->VIC1']).toBeNull();
	});

	it('returns null for an empty response', () => {
		expect(processPairwiseFlows({ data: [] })).toBeNull();
		expect(processPairwiseFlows(undefined)).toBeNull();
	});
});
