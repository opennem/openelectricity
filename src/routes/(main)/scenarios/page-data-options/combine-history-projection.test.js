import { describe, it, expect } from 'vitest';
import combineHistoryProjection, { interpolateGap } from './combine-history-projection.js';

function makeMockTimeSeries({ data, seriesNames, seriesColours = {}, seriesLabels = {}, statsDatasets = [] }) {
	return {
		data,
		seriesNames,
		seriesColours,
		seriesLabels,
		statsDatasets
	};
}

describe('combineHistoryProjection', () => {
	const historyData = [
		{ time: 1000, date: new Date('2022-01-01'), solar: 100, _min: 0, _max: 100 },
		{ time: 2000, date: new Date('2023-01-01'), solar: 110, _min: 0, _max: 110 },
		{ time: 3000, date: new Date('2024-01-01'), solar: 120, _min: 0, _max: 120 }
	];

	const projectionData = [
		{ time: 3000, date: new Date('2024-01-01'), solar: 125, _min: 0, _max: 125 },
		{ time: 4000, date: new Date('2025-01-01'), solar: 130, _min: 0, _max: 130 },
		{ time: 5000, date: new Date('2026-01-01'), solar: 140, _min: 0, _max: 140 }
	];

	it('returns a valid ProcessedDataViz shape', () => {
		const result = combineHistoryProjection({
			historicalTimeSeries: makeMockTimeSeries({
				data: historyData,
				seriesNames: ['solar'],
				seriesColours: { solar: '#ff0' },
				seriesLabels: { solar: 'Solar' }
			}),
			projectionTimeSeries: makeMockTimeSeries({
				data: projectionData,
				seriesNames: ['solar'],
				seriesColours: { solar: '#ff0' },
				seriesLabels: { solar: 'Solar' }
			}),
			baseUnit: 'Wh',
			prefix: 'G',
			displayPrefix: 'T',
			allowedPrefixes: ['G', 'T'],
			chartType: 'area'
		});

		expect(result).toHaveProperty('seriesData');
		expect(result).toHaveProperty('seriesNames');
		expect(result).toHaveProperty('seriesColours');
		expect(result).toHaveProperty('seriesLabels');
		expect(result).toHaveProperty('yDomain');
		expect(result).toHaveProperty('projectionStartTime');
		expect(result).toHaveProperty('prefix');
		expect(result).toHaveProperty('baseUnit');
		expect(result).toHaveProperty('displayPrefix');
		expect(result).toHaveProperty('allowedPrefixes');
	});

	it('trims last history row on overlap when trimSide is history', () => {
		const result = combineHistoryProjection({
			historicalTimeSeries: makeMockTimeSeries({
				data: historyData,
				seriesNames: ['solar']
			}),
			projectionTimeSeries: makeMockTimeSeries({
				data: projectionData,
				seriesNames: ['solar']
			}),
			trimSide: 'history'
		});

		// Should have 5 rows: 2 history + 3 projection (last history trimmed due to overlap at time=3000)
		expect(result.seriesData).toHaveLength(5);
		expect(result.seriesData[0].time).toBe(1000);
		expect(result.seriesData[1].time).toBe(2000);
		expect(result.seriesData[2].time).toBe(3000);
		expect(result.seriesData[2].solar).toBe(125); // projection value, not history
	});

	it('trims first projection row on overlap when trimSide is projection', () => {
		const result = combineHistoryProjection({
			historicalTimeSeries: makeMockTimeSeries({
				data: historyData,
				seriesNames: ['solar']
			}),
			projectionTimeSeries: makeMockTimeSeries({
				data: projectionData,
				seriesNames: ['solar']
			}),
			trimSide: 'projection'
		});

		// Should have 5 rows: 3 history + 2 projection (first projection trimmed)
		expect(result.seriesData).toHaveLength(5);
		expect(result.seriesData[2].time).toBe(3000);
		expect(result.seriesData[2].solar).toBe(120); // history value, not projection
	});

	it('does not trim when timestamps do not overlap', () => {
		const nonOverlappingProjection = [
			{ time: 4000, date: new Date('2025-01-01'), solar: 130, _min: 0, _max: 130 },
			{ time: 5000, date: new Date('2026-01-01'), solar: 140, _min: 0, _max: 140 }
		];

		const result = combineHistoryProjection({
			historicalTimeSeries: makeMockTimeSeries({
				data: historyData,
				seriesNames: ['solar']
			}),
			projectionTimeSeries: makeMockTimeSeries({
				data: nonOverlappingProjection,
				seriesNames: ['solar']
			})
		});

		expect(result.seriesData).toHaveLength(5);
	});

	it('merges colours and labels from both series', () => {
		const result = combineHistoryProjection({
			historicalTimeSeries: makeMockTimeSeries({
				data: [{ time: 1000, date: new Date('2022-01-01'), solar: 100 }],
				seriesNames: ['solar'],
				seriesColours: { solar: '#ff0' },
				seriesLabels: { solar: 'Solar Energy' }
			}),
			projectionTimeSeries: makeMockTimeSeries({
				data: [{ time: 2000, date: new Date('2023-01-01'), wind: 200 }],
				seriesNames: ['wind'],
				seriesColours: { wind: '#00f' },
				seriesLabels: { wind: 'Wind Power' }
			})
		});

		expect(result.seriesColours.solar).toBe('#ff0');
		expect(result.seriesColours.wind).toBe('#00f');
		expect(result.seriesLabels.solar).toBe('Solar Energy');
		expect(result.seriesLabels.wind).toBe('Wind Power');
	});

	it('returns projectionStartTime from first projection data point', () => {
		const result = combineHistoryProjection({
			historicalTimeSeries: makeMockTimeSeries({
				data: historyData,
				seriesNames: ['solar']
			}),
			projectionTimeSeries: makeMockTimeSeries({
				data: projectionData,
				seriesNames: ['solar']
			})
		});

		expect(result.projectionStartTime).toBe(3000);
	});

	it('returns empty result when no history or projection data', () => {
		const result = combineHistoryProjection({
			historicalTimeSeries: makeMockTimeSeries({
				data: [],
				seriesNames: []
			}),
			projectionTimeSeries: makeMockTimeSeries({
				data: [],
				seriesNames: []
			}),
			baseUnit: 'Wh',
			prefix: 'G',
			displayPrefix: 'T',
			allowedPrefixes: ['G', 'T']
		});

		expect(result.seriesData).toEqual([]);
		expect(result.seriesNames).toEqual([]);
		expect(result.baseUnit).toBe('Wh');
	});

	it('uses order array for series name ordering when provided', () => {
		const result = combineHistoryProjection({
			historicalTimeSeries: makeMockTimeSeries({
				data: [{ time: 1000, date: new Date('2022-01-01'), a: 1, b: 2 }],
				seriesNames: ['a', 'b'],
				statsDatasets: [
					{ id: 'a', code: 'wind' },
					{ id: 'b', code: 'solar' }
				]
			}),
			projectionTimeSeries: makeMockTimeSeries({
				data: [{ time: 2000, date: new Date('2023-01-01'), a: 3, b: 4 }],
				seriesNames: ['a', 'b'],
				statsDatasets: [
					{ id: 'a', code: 'wind' },
					{ id: 'b', code: 'solar' }
				]
			}),
			order: /** @type {any} */ (['solar', 'wind'])
		});

		expect(result.seriesNames).toEqual(['b', 'a']);
	});

	it('fills missing series values with null', () => {
		const result = combineHistoryProjection({
			historicalTimeSeries: makeMockTimeSeries({
				data: [{ time: 1000, date: new Date('2022-01-01'), solar: 100 }],
				seriesNames: ['solar']
			}),
			projectionTimeSeries: makeMockTimeSeries({
				data: [{ time: 2000, date: new Date('2023-01-01'), wind: 200 }],
				seriesNames: ['wind']
			})
		});

		// History row should have null for wind, projection row should have null for solar
		expect(result.seriesData[0].wind).toBeNull();
		expect(result.seriesData[1].solar).toBeNull();
	});
});

describe('gap interpolation', () => {
	it('does not interpolate when history and projection are adjacent (no gap)', () => {
		const history = [
			{ time: new Date('2024-01-01').getTime(), date: new Date('2024-01-01'), solar: 100, _min: 0, _max: 100 }
		];
		const projection = [
			{ time: new Date('2025-01-01').getTime(), date: new Date('2025-01-01'), solar: 200, _min: 0, _max: 200 }
		];

		const result = combineHistoryProjection({
			historicalTimeSeries: makeMockTimeSeries({ data: history, seriesNames: ['solar'] }),
			projectionTimeSeries: makeMockTimeSeries({ data: projection, seriesNames: ['solar'] })
		});

		expect(result.derivedStartTime).toBeNull();
		expect(result.derivedEndTime).toBeNull();
		expect(result.seriesData).toHaveLength(2);
	});

	it('interpolates a single gap year', () => {
		const history = [
			{ time: new Date('2025-01-01').getTime(), date: new Date('2025-01-01'), solar: 100, wind: 50, _min: 0, _max: 100 }
		];
		const projection = [
			{ time: new Date('2027-01-01').getTime(), date: new Date('2027-01-01'), solar: 200, wind: 100, _min: 0, _max: 200 }
		];

		const result = combineHistoryProjection({
			historicalTimeSeries: makeMockTimeSeries({ data: history, seriesNames: ['solar', 'wind'] }),
			projectionTimeSeries: makeMockTimeSeries({ data: projection, seriesNames: ['solar', 'wind'] })
		});

		expect(result.seriesData).toHaveLength(3);

		// Middle row is interpolated
		const derived = result.seriesData[1];
		expect(derived._derived).toBe(true);
		expect(derived.date.getFullYear()).toBe(2026);
		expect(derived.date.getMonth()).toBe(0);
		expect(derived.date.getDate()).toBe(1);
		expect(derived.solar).toBe(150); // midpoint
		expect(derived.wind).toBe(75); // midpoint
		expect(derived._min).toBe(0);
		expect(derived._max).toBe(150);

		expect(result.derivedStartTime).toBe(new Date('2026-01-01').getTime());
		expect(result.derivedEndTime).toBe(new Date('2026-01-01').getTime());
	});

	it('interpolates multiple gap years with correct fractions', () => {
		const history = [
			{ time: new Date('2025-01-01').getTime(), date: new Date('2025-01-01'), solar: 0, _min: 0, _max: 0 }
		];
		const projection = [
			{ time: new Date('2029-01-01').getTime(), date: new Date('2029-01-01'), solar: 400, _min: 0, _max: 400 }
		];

		const result = combineHistoryProjection({
			historicalTimeSeries: makeMockTimeSeries({ data: history, seriesNames: ['solar'] }),
			projectionTimeSeries: makeMockTimeSeries({ data: projection, seriesNames: ['solar'] })
		});

		// 3 gap years: 2026, 2027, 2028
		expect(result.seriesData).toHaveLength(5);

		const d2026 = result.seriesData[1];
		const d2027 = result.seriesData[2];
		const d2028 = result.seriesData[3];

		expect(d2026._derived).toBe(true);
		expect(d2027._derived).toBe(true);
		expect(d2028._derived).toBe(true);

		expect(d2026.date.getFullYear()).toBe(2026);
		expect(d2027.date.getFullYear()).toBe(2027);
		expect(d2028.date.getFullYear()).toBe(2028);

		// Fractions: 1/4, 2/4, 3/4
		expect(d2026.solar).toBe(100);
		expect(d2027.solar).toBe(200);
		expect(d2028.solar).toBe(300);

		expect(result.derivedStartTime).toBe(new Date('2026-01-01').getTime());
		expect(result.derivedEndTime).toBe(new Date('2028-01-01').getTime());
	});

	it('sets null for interpolated values when boundary has null', () => {
		const history = [
			{ time: new Date('2025-01-01').getTime(), date: new Date('2025-01-01'), solar: null, _min: 0, _max: 0 }
		];
		const projection = [
			{ time: new Date('2027-01-01').getTime(), date: new Date('2027-01-01'), solar: 200, _min: 0, _max: 200 }
		];

		const result = combineHistoryProjection({
			historicalTimeSeries: makeMockTimeSeries({ data: history, seriesNames: ['solar'] }),
			projectionTimeSeries: makeMockTimeSeries({ data: projection, seriesNames: ['solar'] })
		});

		const derived = result.seriesData[1];
		expect(derived._derived).toBe(true);
		expect(derived.solar).toBeNull();
	});

	it('interpolates _min and _max correctly', () => {
		const history = [
			{ time: new Date('2025-01-01').getTime(), date: new Date('2025-01-01'), solar: 100, _min: -10, _max: 100 }
		];
		const projection = [
			{ time: new Date('2027-01-01').getTime(), date: new Date('2027-01-01'), solar: 200, _min: -20, _max: 200 }
		];

		const result = combineHistoryProjection({
			historicalTimeSeries: makeMockTimeSeries({ data: history, seriesNames: ['solar'] }),
			projectionTimeSeries: makeMockTimeSeries({ data: projection, seriesNames: ['solar'] })
		});

		const derived = result.seriesData[1];
		expect(derived._min).toBe(-15);
		expect(derived._max).toBe(150);
	});
});

describe('interpolateGap', () => {
	it('returns empty array for zero gap years', () => {
		const result = interpolateGap(
			{ time: 1000, date: new Date('2025-01-01'), solar: 100, _min: 0, _max: 100 },
			{ time: 2000, date: new Date('2026-01-01'), solar: 200, _min: 0, _max: 200 },
			0,
			['solar']
		);
		expect(result).toHaveLength(0);
	});

	it('marks all rows as _derived', () => {
		const result = interpolateGap(
			{ time: 1000, date: new Date('2025-01-01'), solar: 100, _min: 0, _max: 100 },
			{ time: 2000, date: new Date('2027-01-01'), solar: 200, _min: 0, _max: 200 },
			1,
			['solar']
		);
		expect(result).toHaveLength(1);
		expect(result[0]._derived).toBe(true);
	});
});
