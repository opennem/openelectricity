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

	it('trims history at overlap point — projection is authoritative', () => {
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

		// Should have 5 rows: 2 history + 3 projection (history at time=3000 trimmed)
		expect(result.seriesData).toHaveLength(5);
		expect(result.seriesData[0].time).toBe(1000);
		expect(result.seriesData[1].time).toBe(2000);
		expect(result.seriesData[2].time).toBe(3000);
		expect(result.seriesData[2].solar).toBe(125); // projection value, not history
	});

	it('trims multi-year overlap — projection starts well before history ends', () => {
		const ONE_YEAR = 365.25 * 24 * 60 * 60 * 1000;
		const baseTime = new Date('2019-01-01').getTime();

		// History: FY2019–FY2024 (6 years)
		const multiHistory = Array.from({ length: 6 }, (_, i) => ({
			time: baseTime + i * ONE_YEAR,
			date: new Date(2019 + i, 0, 1),
			solar: 100 + i * 10,
			_min: 0,
			_max: 100 + i * 10
		}));

		// Projection: FY2022–FY2030 (overlaps history at FY2022–FY2024)
		const multiProjection = Array.from({ length: 9 }, (_, i) => ({
			time: baseTime + (3 + i) * ONE_YEAR,
			date: new Date(2022 + i, 0, 1),
			solar: 200 + i * 10,
			_min: 0,
			_max: 200 + i * 10
		}));

		const result = combineHistoryProjection({
			historicalTimeSeries: makeMockTimeSeries({
				data: multiHistory,
				seriesNames: ['solar']
			}),
			projectionTimeSeries: makeMockTimeSeries({
				data: multiProjection,
				seriesNames: ['solar']
			})
		});

		// History trimmed to FY2019–FY2021 (3 points), then 9 projection points = 12 total
		expect(result.seriesData).toHaveLength(12);

		// No duplicate timestamps
		const times = result.seriesData.map((d) => d.time);
		expect(new Set(times).size).toBe(times.length);

		// First 3 rows are history
		expect(result.seriesData[0].solar).toBe(100);
		expect(result.seriesData[1].solar).toBe(110);
		expect(result.seriesData[2].solar).toBe(120);

		// From FY2022 onward, projection values are used
		expect(result.seriesData[3].solar).toBe(200); // projection value, not history's 130

		// projectionStartTime unchanged
		expect(result.projectionStartTime).toBe(multiProjection[0].time);
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

		// derivedStartTime is one year before first derived row
		expect(result.derivedStartTime).toBe(new Date('2025-01-01').getTime());
		expect(result.derivedEndTime).toBe(new Date('2027-01-01').getTime());
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

		// derivedStartTime is one year before first derived row
		expect(result.derivedStartTime).toBe(new Date('2025-01-01').getTime());
		expect(result.derivedEndTime).toBe(new Date('2029-01-01').getTime());
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

describe('line chart scenario bridging', () => {
	it('anchors projection series to last historical value when series names differ', () => {
		const history = [
			{ time: new Date('2024-01-01').getTime(), date: new Date('2024-01-01'), historical: 100 },
			{ time: new Date('2025-01-01').getTime(), date: new Date('2025-01-01'), historical: 120 }
		];
		const projection = [
			{ time: new Date('2026-01-01').getTime(), date: new Date('2026-01-01'), 'scenario-a': 200, 'scenario-b': 180 },
			{ time: new Date('2027-01-01').getTime(), date: new Date('2027-01-01'), 'scenario-a': 220, 'scenario-b': 190 }
		];

		const result = combineHistoryProjection({
			historicalTimeSeries: makeMockTimeSeries({
				data: history,
				seriesNames: ['historical']
			}),
			projectionTimeSeries: makeMockTimeSeries({
				data: projection,
				seriesNames: ['scenario-a', 'scenario-b']
			}),
			chartType: 'line'
		});

		// Last history row should have projection series anchored to historical value
		const lastHistRow = result.seriesData.find(
			(d) => d.time === new Date('2025-01-01').getTime()
		);
		expect(lastHistRow.historical).toBe(120);
		expect(lastHistRow['scenario-a']).toBe(120);
		expect(lastHistRow['scenario-b']).toBe(120);
	});

	it('interpolates projection series through gap years from historical anchor', () => {
		const history = [
			{ time: new Date('2025-01-01').getTime(), date: new Date('2025-01-01'), historical: 100 }
		];
		const projection = [
			{ time: new Date('2027-01-01').getTime(), date: new Date('2027-01-01'), 'scenario-a': 200 }
		];

		const result = combineHistoryProjection({
			historicalTimeSeries: makeMockTimeSeries({
				data: history,
				seriesNames: ['historical']
			}),
			projectionTimeSeries: makeMockTimeSeries({
				data: projection,
				seriesNames: ['scenario-a']
			}),
			chartType: 'line'
		});

		// 1 history + 1 interpolated gap + 1 projection = 3
		expect(result.seriesData).toHaveLength(3);

		// History row anchored
		expect(result.seriesData[0]['scenario-a']).toBe(100);

		// Interpolated gap row: midpoint between 100 and 200
		const gapRow = result.seriesData[1];
		expect(gapRow._derived).toBe(true);
		expect(gapRow['scenario-a']).toBe(150);

		// Historical series is null in gap (no false extension)
		expect(gapRow.historical).toBeNull();
	});

	it('does not anchor or interpolate when keepFullHistory is true', () => {
		const history = [
			{ time: new Date('2024-01-01').getTime(), date: new Date('2024-01-01'), historical: 100 },
			{ time: new Date('2025-01-01').getTime(), date: new Date('2025-01-01'), historical: 120 }
		];
		const projection = [
			{ time: new Date('2027-01-01').getTime(), date: new Date('2027-01-01'), 'scenario-a': 200 }
		];

		const result = combineHistoryProjection({
			historicalTimeSeries: makeMockTimeSeries({
				data: history,
				seriesNames: ['historical']
			}),
			projectionTimeSeries: makeMockTimeSeries({
				data: projection,
				seriesNames: ['scenario-a']
			}),
			chartType: 'line',
			keepFullHistory: true
		});

		// 2 history + 0 interpolated + 1 projection = 3 (no gap fill)
		expect(result.seriesData).toHaveLength(3);
		expect(result.seriesData.filter((d) => d._derived)).toHaveLength(0);

		// Last history row should NOT have scenario-a anchored
		const lastHistRow = result.seriesData[1];
		expect(lastHistRow.historical).toBe(120);
		expect(lastHistRow['scenario-a']).toBeNull();
	});

	it('does not anchor when chart type is area', () => {
		const history = [
			{ time: new Date('2025-01-01').getTime(), date: new Date('2025-01-01'), historical: 100, _min: 0, _max: 100 }
		];
		const projection = [
			{ time: new Date('2026-01-01').getTime(), date: new Date('2026-01-01'), 'scenario-a': 200, _min: 0, _max: 200 }
		];

		const result = combineHistoryProjection({
			historicalTimeSeries: makeMockTimeSeries({
				data: history,
				seriesNames: ['historical']
			}),
			projectionTimeSeries: makeMockTimeSeries({
				data: projection,
				seriesNames: ['scenario-a']
			}),
			chartType: 'area'
		});

		// Last history row should NOT have scenario-a anchored (filled with null instead)
		const lastHistRow = result.seriesData[0];
		expect(lastHistRow['scenario-a']).toBeNull();
	});
});

describe('keepFullHistory (By Scenario)', () => {
	it('preserves all history rows when projection overlaps', () => {
		const history = [
			{ time: new Date('2020-01-01').getTime(), date: new Date('2020-01-01'), historical: 80 },
			{ time: new Date('2021-01-01').getTime(), date: new Date('2021-01-01'), historical: 90 },
			{ time: new Date('2022-01-01').getTime(), date: new Date('2022-01-01'), historical: 100 },
			{ time: new Date('2023-01-01').getTime(), date: new Date('2023-01-01'), historical: 110 },
			{ time: new Date('2024-01-01').getTime(), date: new Date('2024-01-01'), historical: 120 }
		];
		const projection = [
			{ time: new Date('2022-01-01').getTime(), date: new Date('2022-01-01'), 'scenario-a': 200 },
			{ time: new Date('2023-01-01').getTime(), date: new Date('2023-01-01'), 'scenario-a': 210 },
			{ time: new Date('2024-01-01').getTime(), date: new Date('2024-01-01'), 'scenario-a': 220 }
		];

		const result = combineHistoryProjection({
			historicalTimeSeries: makeMockTimeSeries({
				data: history,
				seriesNames: ['historical']
			}),
			projectionTimeSeries: makeMockTimeSeries({
				data: projection,
				seriesNames: ['scenario-a']
			}),
			chartType: 'line',
			keepFullHistory: true
		});

		// 5 unique time points (overlapping rows at 2022–2024 are merged)
		expect(result.seriesData).toHaveLength(5);

		// All history values preserved — no trimming
		const historyRows = result.seriesData.filter((d) => d.historical != null);
		expect(historyRows).toHaveLength(5);
		expect(historyRows[4].historical).toBe(120);

		// Overlapping rows have both history and projection values
		const overlap2022 = result.seriesData.find(
			(d) => d.time === new Date('2022-01-01').getTime()
		);
		expect(overlap2022.historical).toBe(100);
		expect(overlap2022['scenario-a']).toBe(200);
	});

	it('trims history at overlap when keepFullHistory is false (default)', () => {
		const history = [
			{ time: new Date('2020-01-01').getTime(), date: new Date('2020-01-01'), historical: 80 },
			{ time: new Date('2022-01-01').getTime(), date: new Date('2022-01-01'), historical: 100 },
			{ time: new Date('2024-01-01').getTime(), date: new Date('2024-01-01'), historical: 120 }
		];
		const projection = [
			{ time: new Date('2022-01-01').getTime(), date: new Date('2022-01-01'), 'scenario-a': 200 },
			{ time: new Date('2024-01-01').getTime(), date: new Date('2024-01-01'), 'scenario-a': 220 }
		];

		const result = combineHistoryProjection({
			historicalTimeSeries: makeMockTimeSeries({
				data: history,
				seriesNames: ['historical']
			}),
			projectionTimeSeries: makeMockTimeSeries({
				data: projection,
				seriesNames: ['scenario-a']
			}),
			chartType: 'line'
		});

		// History trimmed to 1 row (before 2022) + 1 interpolated gap + 2 projection = 4
		expect(result.seriesData).toHaveLength(4);
		expect(result.seriesData[0].historical).toBe(80);
		expect(result.seriesData[1]._derived).toBe(true);
		expect(result.seriesData[2]['scenario-a']).toBe(200);
	});

	it('does not produce interpolated rows when keepFullHistory is true', () => {
		const history = [
			{ time: new Date('2020-01-01').getTime(), date: new Date('2020-01-01'), historical: 100 }
		];
		const projection = [
			{ time: new Date('2025-01-01').getTime(), date: new Date('2025-01-01'), 'scenario-a': 300 }
		];

		const result = combineHistoryProjection({
			historicalTimeSeries: makeMockTimeSeries({
				data: history,
				seriesNames: ['historical']
			}),
			projectionTimeSeries: makeMockTimeSeries({
				data: projection,
				seriesNames: ['scenario-a']
			}),
			chartType: 'line',
			keepFullHistory: true
		});

		// 1 history + 0 interpolated + 1 projection = 2
		expect(result.seriesData).toHaveLength(2);
		expect(result.seriesData.filter((d) => d._derived)).toHaveLength(0);
	});

	it('merges overlapping rows so history values are not overwritten with null', () => {
		// Simulates adding a 2018 ISP pathway: projection starts at FY18,
		// overlapping with history FY10–FY25. Without merging, duplicate rows
		// at the same time would have historical: null on the projection copy,
		// breaking the historical line on the chart.
		const history = [
			{ time: new Date('2018-01-01').getTime(), date: new Date('2018-01-01'), historical: 500 },
			{ time: new Date('2019-01-01').getTime(), date: new Date('2019-01-01'), historical: 510 },
			{ time: new Date('2020-01-01').getTime(), date: new Date('2020-01-01'), historical: 520 }
		];
		const projection = [
			{ time: new Date('2018-01-01').getTime(), date: new Date('2018-01-01'), 'aemo2018-neutral-default': 480 },
			{ time: new Date('2019-01-01').getTime(), date: new Date('2019-01-01'), 'aemo2018-neutral-default': 460 },
			{ time: new Date('2020-01-01').getTime(), date: new Date('2020-01-01'), 'aemo2018-neutral-default': 440 },
			{ time: new Date('2021-01-01').getTime(), date: new Date('2021-01-01'), 'aemo2018-neutral-default': 420 }
		];

		const result = combineHistoryProjection({
			historicalTimeSeries: makeMockTimeSeries({
				data: history,
				seriesNames: ['historical']
			}),
			projectionTimeSeries: makeMockTimeSeries({
				data: projection,
				seriesNames: ['aemo2018-neutral-default']
			}),
			chartType: 'line',
			keepFullHistory: true
		});

		// 3 overlapping + 1 projection-only = 4 unique time points
		expect(result.seriesData).toHaveLength(4);

		// No duplicate time points
		const times = result.seriesData.map((d) => d.time);
		expect(new Set(times).size).toBe(4);

		// Historical values preserved at overlap points
		const row2018 = result.seriesData.find((d) => d.time === new Date('2018-01-01').getTime());
		expect(row2018.historical).toBe(500);
		expect(row2018['aemo2018-neutral-default']).toBe(480);

		const row2020 = result.seriesData.find((d) => d.time === new Date('2020-01-01').getTime());
		expect(row2020.historical).toBe(520);
		expect(row2020['aemo2018-neutral-default']).toBe(440);

		// Projection-only row has null for historical
		const row2021 = result.seriesData.find((d) => d.time === new Date('2021-01-01').getTime());
		expect(row2021['aemo2018-neutral-default']).toBe(420);
		expect(row2021.historical).toBeNull();
	});

	it('does not merge rows when keepFullHistory is false — trims history instead', () => {
		const history = [
			{ time: new Date('2016-01-01').getTime(), date: new Date('2016-01-01'), historical: 490 },
			{ time: new Date('2018-01-01').getTime(), date: new Date('2018-01-01'), historical: 500 },
			{ time: new Date('2020-01-01').getTime(), date: new Date('2020-01-01'), historical: 520 }
		];
		const projection = [
			{ time: new Date('2018-01-01').getTime(), date: new Date('2018-01-01'), 'scenario-a': 480 },
			{ time: new Date('2020-01-01').getTime(), date: new Date('2020-01-01'), 'scenario-a': 440 }
		];

		const result = combineHistoryProjection({
			historicalTimeSeries: makeMockTimeSeries({
				data: history,
				seriesNames: ['historical']
			}),
			projectionTimeSeries: makeMockTimeSeries({
				data: projection,
				seriesNames: ['scenario-a']
			}),
			chartType: 'line',
			keepFullHistory: false
		});

		// History trimmed to 1 row (before 2018) + 2 projection = 3
		// (plus possible interpolation, but gap is 1yr so anchoring applies)
		expect(result.seriesData[0].historical).toBe(490);
		// Projection rows present
		const proj2018 = result.seriesData.find(
			(d) => d.time === new Date('2018-01-01').getTime()
		);
		expect(proj2018['scenario-a']).toBe(480);
	});

	it('keeps null values in gap year rows so stacked-area charts cut off instead of drawing to 0', () => {
		// Simulates By Scenario mini charts: history ends at FY25, projection starts at FY27,
		// FY26 is the gap year. With keepFullHistory, no interpolation fills the gap.
		// The gap row should have null for projection series so ChartStore marks it as undefined.
		const history = [
			{ time: new Date('2024-01-01').getTime(), date: new Date('2024-01-01'), historical: 100 },
			{ time: new Date('2025-01-01').getTime(), date: new Date('2025-01-01'), historical: 120 }
		];
		const projection = [
			{ time: new Date('2027-01-01').getTime(), date: new Date('2027-01-01'), 'scenario-a': 200 },
			{ time: new Date('2028-01-01').getTime(), date: new Date('2028-01-01'), 'scenario-a': 220 }
		];

		const result = combineHistoryProjection({
			historicalTimeSeries: makeMockTimeSeries({
				data: history,
				seriesNames: ['historical']
			}),
			projectionTimeSeries: makeMockTimeSeries({
				data: projection,
				seriesNames: ['scenario-a']
			}),
			chartType: 'line',
			keepFullHistory: true
		});

		// 2 history + 2 projection = 4 (no interpolation with keepFullHistory)
		expect(result.seriesData).toHaveLength(4);
		expect(result.seriesData.filter((d) => d._derived)).toHaveLength(0);

		// History rows should have null for scenario-a
		expect(result.seriesData[0]['scenario-a']).toBeNull();
		expect(result.seriesData[1]['scenario-a']).toBeNull();

		// Projection rows should have null for historical
		expect(result.seriesData[2].historical).toBeNull();
		expect(result.seriesData[3].historical).toBeNull();
	});

	it('preserves data order as sorted by time after merging', () => {
		const history = [
			{ time: new Date('2022-01-01').getTime(), date: new Date('2022-01-01'), historical: 100 },
			{ time: new Date('2024-01-01').getTime(), date: new Date('2024-01-01'), historical: 120 }
		];
		const projection = [
			{ time: new Date('2023-01-01').getTime(), date: new Date('2023-01-01'), 'scenario-a': 300 },
			{ time: new Date('2025-01-01').getTime(), date: new Date('2025-01-01'), 'scenario-a': 400 }
		];

		const result = combineHistoryProjection({
			historicalTimeSeries: makeMockTimeSeries({
				data: history,
				seriesNames: ['historical']
			}),
			projectionTimeSeries: makeMockTimeSeries({
				data: projection,
				seriesNames: ['scenario-a']
			}),
			chartType: 'line',
			keepFullHistory: true
		});

		// Should be sorted by time
		for (let i = 1; i < result.seriesData.length; i++) {
			expect(result.seriesData[i].time).toBeGreaterThan(result.seriesData[i - 1].time);
		}
	});
});
