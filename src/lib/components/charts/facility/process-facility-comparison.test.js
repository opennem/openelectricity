import { describe, expect, it } from 'vitest';
import { processFacilityComparison } from './process-facility-comparison.js';

const facilities = [
	{
		code: 'ALPHA',
		name: 'Alpha Wind Farm',
		units: [
			{ code: 'A1', dispatch_type: 'GENERATOR' },
			{ code: 'A2', dispatch_type: 'GENERATOR' }
		]
	},
	{
		code: 'BATTERY',
		name: 'Battery',
		units: [{ code: 'B1', dispatch_type: 'LOAD' }]
	}
];

describe('processFacilityComparison', () => {
	it('aggregates units by facility and renders load units below zero', () => {
		const result = processFacilityComparison(
			{
				data: [
					{
						metric: 'power',
						results: [
							{
								columns: { facility_code: 'ALPHA', unit_code: 'A1' },
								data: [['2026-01-01T00:00:00', 10]]
							},
							{
								columns: { facility_code: 'ALPHA', unit_code: 'A2' },
								data: [['2026-01-01T00:00:00', 5]]
							},
							{
								columns: { facility_code: 'BATTERY', unit_code: 'B1' },
								data: [['2026-01-01T00:00:00', 3]]
							}
						]
					}
				]
			},
			{ metric: 'power', facilities, networkTimezone: '+10:00' }
		);

		expect(result?.seriesNames).toEqual(['ALPHA', 'BATTERY']);
		expect(result?.seriesLabels).toEqual({ ALPHA: 'Alpha Wind Farm', BATTERY: 'Battery' });
		expect(result?.data).toHaveLength(1);
		expect(result?.data[0]).toMatchObject({ ALPHA: 15, BATTERY: -3 });
	});

	it('returns null when the requested metric has no usable samples', () => {
		expect(
			processFacilityComparison(
				{ data: [{ metric: 'energy', results: [] }] },
				{ metric: 'power', facilities, networkTimezone: '+10:00' }
			)
		).toBeNull();
	});
});
