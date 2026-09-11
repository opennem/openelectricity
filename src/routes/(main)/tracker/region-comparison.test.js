import { comparisonYDomain } from './region-comparison.js';
import { describe, expect, it } from 'vitest';
import {
	aggregateComparison,
	clampComparisonViewport,
	applyRegionComparison,
	comparisonBounds,
	comparisonPeriod,
	comparisonValues,
	comparisonChartRows,
	DEFAULT_COMPARISON_REGIONS,
	joinComparisonComponents,
	latestCommonComparisonPeriod,
	monthStart,
	normaliseRegionComparison,
	parseRegionComparison,
	processComparisonEnergy,
	sumComparisonNetworks
} from './region-comparison.js';
import {
	comparisonCsv,
	comparisonExportDataset,
	comparisonWorkbook
} from './region-comparison-export.js';
import { parseTrackerUrl, applyTrackerUrl } from './tracker-url.js';

const start = Date.UTC(2024, 0, 1);
/** @returns {any[]} */
const monthly = (count = 24) =>
	Array.from({ length: count }, (_, i) => ({
		time: monthStart(start, i),
		date: new Date(monthStart(start, i)),
		emissions: i === 0 ? 100 : 900,
		energy_mwh: i === 0 ? 1000 : 3000,
		generation_mwh: 2000,
		renewables: 1500,
		demand_gross: 1000
	}));

describe('region comparison calculations', () => {
	it('draws gaps for entirely absent calendar periods without inventing exported observations', () => {
		const data = { nsw1: monthly(3).filter((_, i) => i !== 1) };
		const rows = comparisonChartRows(data, ['nsw1'], 'generation', 'demand', '1M');
		expect(rows).toHaveLength(3);
		expect(rows[1].nsw1).toBeNull();
		const state = normaliseRegionComparison({ regions: ['nsw1'], interval: '1M' });
		expect(
			comparisonExportDataset(data, state, { start, end: Date.UTC(2025, 0) }).rows
		).toHaveLength(2);
	});
	it('uses weighted component ratios, including demand shares above 100%', () => {
		const rows = aggregateComparison(monthly(), '12mr', Date.UTC(2026, 0));
		expect(rows).toHaveLength(13);
		expect(comparisonValues(rows[0], 'demand')).toEqual({
			intensity: (10000 / 34000) * 1000,
			generation: 18000,
			share: 150
		});
		expect(comparisonValues(rows[0], 'generation').share).toBe(75);
	});
	it('preserves zero numerators and rejects non-positive or missing denominators', () => {
		expect(
			comparisonValues({ emissions: 0, energy_mwh: 10, renewables: 0, demand_gross: 10 }, 'demand')
		).toEqual({ intensity: 0, generation: 0, share: 0 });
		expect(
			comparisonValues({ emissions: 5, energy_mwh: 0, renewables: 10, demand_gross: -1 }, 'demand')
		).toEqual({ intensity: null, generation: 10, share: null });
		expect(comparisonValues(undefined, 'generation')).toEqual({
			intensity: null,
			generation: null,
			share: null
		});
	});
	it('does not fill incomplete or gapped rolling windows', () => {
		expect(aggregateComparison(monthly(11), '12mr', Date.UTC(2026, 0))).toEqual([]);
		const rows = monthly(13).filter((_, i) => i !== 5);
		expect(aggregateComparison(rows, '12mr', Date.UTC(2026, 0))).toEqual([]);
		const missing = monthly(12);
		missing[5].renewables = null;
		expect(aggregateComparison(missing, '12mr', Date.UTC(2026, 0))[0].renewables).toBeNull();
	});
	it('only includes complete months and years and uses July financial years', () => {
		const data = monthly();
		expect(aggregateComparison(data, '1M', Date.UTC(2024, 5))).toHaveLength(5);
		expect(aggregateComparison(data, '1y', Date.UTC(2025, 5))).toHaveLength(1);
		const financial = aggregateComparison(data, 'fy', Date.UTC(2026, 0));
		const complete = financial.find((row) => row.time === Date.UTC(2024, 6));
		expect(complete.renewables).toBe(18000);
		expect(comparisonPeriod(complete.time, 'fy')).toBe('2024–25 financial year');
		expect(financial.find((row) => row.time === Date.UTC(2025, 6))).toBeUndefined();
		expect(comparisonBounds(Date.parse('2026-08-31T15:00:00Z')).end).toBe(Date.UTC(2026, 7));
		expect(comparisonBounds(Date.parse('2026-08-31T16:00:00Z')).end).toBe(Date.UTC(2026, 8));
	});
	it('joins monthly components and requires both networks for national values', () => {
		const row = monthly(1)[0];
		const joined = joinComparisonComponents(
			[{ time: start, emissions: 1 }],
			[{ time: start, renewables: 2 }]
		);
		expect(joined).toEqual([{ time: start, emissions: 1, renewables: 2 }]);
		expect(sumComparisonNetworks([row], [{ ...row, energy_mwh: 9000 }])[0].energy_mwh).toBe(10000);
		expect(sumComparisonNetworks([row], [])[0].renewables).toBeNull();
	});
	it('uses calendar labels for differently offset NEM/WEM responses and Tracker generation membership', () => {
		/** @param {string} zone @returns {any} */
		const response = (zone) => ({
			data: ['emissions', 'energy'].map((metric) => ({
				metric,
				results: ['coal_black', 'wind', 'battery_charging', 'imports'].map((tech, i) => ({
					columns: { fueltech: tech },
					data: [
						[
							`2024-01-01T00:00:00${zone}`,
							metric === 'emissions' ? (i === 0 ? 500 : 0) : [1000, 1000, 100, 500][i]
						]
					]
				}))
			}))
		});
		const nem = processComparisonEnergy(response('+10:00'));
		const wem = processComparisonEnergy(response('+08:00'));
		expect(nem?.data[0].time).toBe(start);
		expect(wem?.data[0].time).toBe(start);
		expect(nem?.data[0].generation_mwh).toBe(2000);
		const gap = response('+10:00');
		gap.data[1].results[1].data[0][1] = null;
		expect(processComparisonEnergy(gap)?.data[0].generation_mwh).toBeNull();
	});
	it('selects a common completed period without mixing region dates', () => {
		const data = { a: monthly(12), b: monthly(10) };
		const viewport = { start, end: Date.UTC(2025, 0) };
		expect(latestCommonComparisonPeriod(data, ['a', 'b'], 'demand', viewport)).toBe(
			Date.UTC(2024, 9)
		);
		expect(latestCommonComparisonPeriod(data, ['a', 'missing'], 'demand', viewport)).toBeNull();
		expect(latestCommonComparisonPeriod(data, [], 'demand', viewport)).toBeNull();
	});
});

describe('region comparison navigation and export', () => {
	it('clamps copied future windows and short ranges to available complete history', () => {
		const bounds = { start, end: Date.UTC(2026, 0) };
		expect(clampComparisonViewport(Date.UTC(2030, 0), Date.UTC(2031, 0), bounds).end).toBe(
			bounds.end
		);
		expect(clampComparisonViewport(start, start + 1, bounds).end - start).toBe(366 * 86_400_000);
		expect(clampComparisonViewport(Date.UTC(1999, 0), Date.UTC(2040, 0), bounds)).toEqual(bounds);
	});
	it('validates defaults, keeps empty selection, and round-trips every comparison control', () => {
		expect(
			normaliseRegionComparison({ interval: '5m', regions: ['nsw1', 'nsw1', 'invalid'] }).regions
		).toEqual(['nsw1']);
		expect(normaliseRegionComparison().regions).toEqual(DEFAULT_COMPARISON_REGIONS);
		for (const regions of [[], ['nsw1', 'au']]) {
			const state = normaliseRegionComparison({
				interval: 'fy',
				mode: 'generation',
				basis: 'generation',
				table: false,
				regions,
				start,
				end: Date.UTC(2025, 0)
			});
			const params = new URLSearchParams();
			applyRegionComparison(params, state);
			expect(parseRegionComparison(params)).toEqual(state);
		}
	});
	it('preserves legacy view, range and comparison state through shared navigation', () => {
		const original = parseTrackerUrl(new URLSearchParams('view=daily&range=30d'), { nowMs: start });
		const state = {
			...original,
			compareRegions: true,
			regionComparison: normaliseRegionComparison({ interval: '1M' })
		};
		const url = applyTrackerUrl(new URL('https://example.com/tracker'), state);
		expect(url.searchParams.get('view')).toBe('regions');
		const restored = parseTrackerUrl(url.searchParams, { nowMs: start });
		expect(restored.range).toEqual(original.range);
		expect(restored.profileView).toBe('daily');
		expect(restored.regionComparison?.interval).toBe('1M');
	});
	it('exports period, region, base units and the chosen denominator with blank missing values', () => {
		const state = normaliseRegionComparison({
			regions: ['nsw1'],
			interval: '1M',
			charts: ['intensity', 'share']
		});
		const data = { nsw1: [{ ...monthly(1)[0], emissions: null }] };
		const dataset = comparisonExportDataset(data, state, { start, end: Date.UTC(2025, 0) });
		const csv = comparisonCsv(dataset);
		expect(csv).toContain('Carbon intensity (kgCO2e/MWh)');
		expect(csv).toContain('gross demand (%)');
		expect(csv).toContain('Jan 2024,New South Wales,,150');
		const sheets = comparisonWorkbook(dataset, 'https://example.com/tracker?view=regions', state);
		expect(sheets).toHaveLength(2);
		expect(sheets[1].data[1][3]).toEqual({ value: 150, type: Number });
	});
});

describe('comparison viewport Y domain', () => {
	it('excludes offscreen peaks and hidden regions, and rescales after panning', () => {
		const rows = [
			{ time: 0, nsw: 1000, vic: 9000 },
			{ time: 10, nsw: 20, vic: 9000 },
			{ time: 20, nsw: 40, vic: 9000 },
			{ time: 30, nsw: 80, vic: 9000 }
		];
		expect(comparisonYDomain(rows, ['nsw'], { start: 10, end: 20 })).toEqual([0, 44]);
		expect(comparisonYDomain(rows, ['nsw'], { start: 20, end: 30 })).toEqual([0, 88]);
	});
	it('includes interpolated edge values without including the offscreen peak', () => {
		const rows = [
			{ time: 0, nsw: 100 },
			{ time: 10, nsw: 0 }
		];
		expect(comparisonYDomain(rows, ['nsw'], { start: 5, end: 8 })).toEqual([0, 55]);
	});
	it('does not interpolate across gaps and keeps negative lines separate', () => {
		const rows = [
			{ time: 0, nsw: -100, vic: -50 },
			{ time: 10, nsw: null, vic: null }
		];
		expect(comparisonYDomain(rows, ['nsw', 'vic'], { start: 1, end: 9 })).toEqual([0, 0]);
		expect(comparisonYDomain(rows, ['nsw', 'vic'], { start: 0, end: 10 })).toEqual([-110, 0]);
		expect(comparisonYDomain([], ['nsw'], { start: 0, end: 10 })).toEqual([0, 0]);
	});
});

it('bounds step and smooth curves at viewport edges without clipping their segments', () => {
	const rows = [
		{ time: 0, nsw: 100 },
		{ time: 10, nsw: 0 }
	];
	expect(comparisonYDomain(rows, ['nsw'], { start: 5, end: 8 }, 'step')).toEqual([0, 110]);
	expect(comparisonYDomain(rows, ['nsw'], { start: 5, end: 8 }, 'smooth')).toEqual([0, 110]);
	expect(comparisonYDomain(rows, ['nsw'], { start: 5, end: 8 }, 'straight')).toEqual([0, 55]);
});
