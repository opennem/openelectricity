import { comparisonYDomain } from './region-comparison.js';
import { describe, expect, it } from 'vitest';
import {
	DAILY_WINDOW_MS,
	comparisonBoundsFor,
	comparisonDefaultLabel,
	comparisonDefaultViewport,
	comparisonTickLabel,
	dailyFetchWindow,
	dayStart,
	nextPeriodStart,
	aggregateComparison,
	assembleComparisonMonthly,
	clampComparisonViewport,
	comparisonSourceActive,
	comparisonStatus,
	comparisonTicks,
	visibleComparisonRows,
	applyRegionComparison,
	comparisonBounds,
	comparisonPeriod,
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
	comparisonExportDataset,
	comparisonFileName,
	comparisonWorkbook,
	regionComparisonCsv
} from './region-comparison-export.js';
import { comparisonMetricValue } from './comparison-metrics.js';
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
		expect(comparisonMetricValue(rows[0], 'intensity', 'demand')).toBe((10000 / 34000) * 1000);
		expect(comparisonMetricValue(rows[0], 'generation', 'demand')).toBe(18000);
		expect(comparisonMetricValue(rows[0], 'share', 'demand')).toBe(150);
		expect(comparisonMetricValue(rows[0], 'share', 'generation')).toBe(75);
	});
	it('preserves zero numerators and rejects non-positive or missing denominators', () => {
		const zero = { emissions: 0, energy_mwh: 10, renewables: 0, demand_gross: 10 };
		expect(
			['intensity', 'generation', 'share'].map((id) => comparisonMetricValue(zero, id, 'demand'))
		).toEqual([0, 0, 0]);
		const bad = { emissions: 5, energy_mwh: 0, renewables: 10, demand_gross: -1 };
		expect(
			['intensity', 'generation', 'share'].map((id) => comparisonMetricValue(bad, id, 'demand'))
		).toEqual([null, 10, null]);
		expect(
			['intensity', 'generation', 'share'].map((id) =>
				comparisonMetricValue(undefined, id, 'generation')
			)
		).toEqual([null, null, null]);
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
		const charts = ['intensity', 'share'];
		expect(latestCommonComparisonPeriod(data, ['a', 'b'], 'demand', viewport, charts)).toBe(
			Date.UTC(2024, 9)
		);
		expect(
			latestCommonComparisonPeriod(data, ['a', 'missing'], 'demand', viewport, charts)
		).toBeNull();
		expect(latestCommonComparisonPeriod(data, [], 'demand', viewport, charts)).toBeNull();
		expect(latestCommonComparisonPeriod(data, ['a', 'b'], 'demand', viewport, [])).toBeNull();
	});
	it('thins ticks to at most six, anchored to the calendar so they slide with the window', () => {
		const rows = monthly(24);
		const viewport = { start: monthStart(start, 3), end: monthStart(start, 15) };
		const visible = visibleComparisonRows(rows, viewport);
		expect(visible).toHaveLength(12);
		expect(visible[0].time).toBe(monthStart(start, 3));
		const ticks = comparisonTicks(visible).map((date) => date.getTime());
		expect(ticks).toHaveLength(6);
		expect(ticks[0]).toBe(monthStart(start, 4)); // May: even months from January
		const shifted = comparisonTicks(
			visibleComparisonRows(rows, { start: monthStart(start, 4), end: monthStart(start, 16) })
		).map((date) => date.getTime());
		expect(shifted.slice(0, 5)).toEqual(
			ticks
				.slice(0, 5)
				.map((t) => t)
				.filter((t) => t >= monthStart(start, 4))
		);
		expect(comparisonTicks(visible.slice(0, 4))).toHaveLength(4);
		expect(comparisonTicks([])).toEqual([]);
		const years = Array.from({ length: 30 }, (_, i) => ({
			time: Date.UTC(1999 + i, 0, 1),
			date: new Date(Date.UTC(1999 + i, 0, 1))
		}));
		expect(comparisonTicks(years, '1y').map((date) => date.getUTCFullYear())).toEqual([
			2000, 2005, 2010, 2015, 2020, 2025
		]);
	});
	it('opens each interval on its own window and names the reset', () => {
		const bounds = { start: Date.UTC(1998, 11, 7), end: Date.UTC(2026, 8, 1) };
		expect(comparisonDefaultViewport('12mr', bounds)).toEqual({
			start: Date.UTC(2021, 8, 1),
			end: bounds.end
		});
		expect(comparisonDefaultViewport('1M', bounds).start).toBe(Date.UTC(2021, 8, 1));
		expect(comparisonDefaultViewport('1y', bounds)).toEqual(bounds);
		expect(comparisonDefaultViewport('fy', bounds)).toEqual(bounds);
		expect(
			comparisonDefaultViewport('1d', { start: bounds.start, end: Date.UTC(2026, 8, 11) })
		).toEqual({
			start: Date.UTC(2026, 8, 11) - DAILY_WINDOW_MS,
			end: Date.UTC(2026, 8, 11)
		});
		expect(
			comparisonDefaultViewport('1M', { start: Date.UTC(2024, 0), end: bounds.end }).start
		).toBe(Date.UTC(2024, 0));
		expect(comparisonDefaultLabel('12mr')).toBe('Last 5 years');
		expect(comparisonDefaultLabel('fy')).toBe('All history');
		expect(comparisonDefaultLabel('1d')).toBe('Latest year');
	});
	it('activates the two networks behind the combined scope and rolls their status up', () => {
		expect(comparisonSourceActive(['nsw1'], 'nsw1')).toBe(true);
		expect(comparisonSourceActive(['au'], 'wem')).toBe(true);
		expect(comparisonSourceActive(['au'], 'nsw1')).toBe(false);
		const status = comparisonStatus({
			_all: { pending: false, error: 'Upstream failed' },
			wem: { pending: true, error: null },
			nsw1: { pending: false, error: null }
		});
		expect(status.au).toEqual({ pending: true, error: 'Upstream failed' });
		expect(status.nsw1).toEqual({ pending: false, error: null });
	});
	it('assembles monthly components, zeroes closed-network imports and sums the combined scope', () => {
		const rows = monthly(2);
		const flows = rows.map((row) => ({ time: row.time, date: row.date, net_imports: 5 }));
		const assembled = assembleComparisonMonthly({
			_all: { energy: rows, market: [], financial: [], flows },
			wem: { energy: rows, market: [], financial: [], flows },
			nsw1: { energy: rows, market: [], financial: [], flows }
		});
		expect(assembled.nsw1[0].net_imports).toBe(5);
		expect(assembled._all[0].net_imports).toBe(0);
		expect(assembled.wem[0].net_imports).toBe(0);
		expect(assembled.au[0].energy_mwh).toBe(2000);
		expect(assembled.au).toHaveLength(2);
	});
	it('judges completeness by the displayed metrics, not the legacy trio', () => {
		const data = { a: monthly(12), b: monthly(10) };
		const viewport = { start, end: Date.UTC(2025, 0) };
		// No market values: a price-only view has no complete period, a share-only view does.
		expect(
			latestCommonComparisonPeriod(data, ['a', 'b'], 'demand', viewport, ['price'])
		).toBeNull();
		expect(latestCommonComparisonPeriod(data, ['a', 'b'], 'demand', viewport, ['share'])).toBe(
			Date.UTC(2024, 9)
		);
	});
});

describe('region comparison navigation and export', () => {
	it('names downloads by interval and visible periods', () => {
		const state = normaliseRegionComparison({ interval: '1M' });
		const viewport = { start: Date.UTC(2024, 0), end: Date.UTC(2025, 0) };
		expect(comparisonFileName(state, viewport, 'csv')).toBe(
			'tracker-regions-1m-2024-01-to-2024-12.csv'
		);
		expect(comparisonFileName(normaliseRegionComparison({}), viewport, 'xlsx')).toBe(
			'tracker-regions-12mr-2024-01-to-2024-12.xlsx'
		);
	});
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
				display: 'stripes',
				mode: 'generation',
				basis: 'generation',
				table: false,
				regions,
				start,
				end: Date.UTC(2025, 0)
			});
			const params = new URLSearchParams();
			applyRegionComparison(params, state);
			expect(params.get('compare-display')).toBe('stripes');
			expect(parseRegionComparison(params)).toEqual(state);
		}
		expect(normaliseRegionComparison({ display: 'bogus' }).display).toBe('charts');
		const params = new URLSearchParams();
		applyRegionComparison(params, normaliseRegionComparison({}));
		expect(params.has('compare-display')).toBe(false);
	});
	it('fixes the daily interval to a one-year window ending on the last complete day', () => {
		const now = Date.UTC(2026, 8, 17, 20);
		const bounds = comparisonBounds(now);
		expect(bounds.end).toBe(Date.UTC(2026, 8, 1));
		expect(bounds.dayEnd).toBe(Date.UTC(2026, 8, 18));
		expect(comparisonBoundsFor(bounds, '1d').end).toBe(bounds.dayEnd);
		expect(comparisonBoundsFor(bounds, '1M').end).toBe(bounds.end);
		const daily = comparisonBoundsFor(bounds, '1d');
		const latest = clampComparisonViewport(Date.UTC(2030, 0), Date.UTC(2031, 0), daily, '1d');
		expect(latest).toEqual({ start: daily.end - DAILY_WINDOW_MS, end: daily.end });
		const wide = clampComparisonViewport(Date.UTC(2010, 0), Date.UTC(2020, 0), daily, '1d');
		expect(wide.end - wide.start).toBe(DAILY_WINDOW_MS);
		expect(wide.end).toBe(Date.UTC(2020, 0));
		expect(clampComparisonViewport(Date.UTC(1990, 0), Date.UTC(1990, 6), daily, '1d').start).toBe(
			daily.start
		);
		expect(nextPeriodStart(Date.UTC(2024, 1, 28), '1d')).toBe(Date.UTC(2024, 1, 29));
		expect(nextPeriodStart(Date.UTC(2024, 1, 1), '1M')).toBe(Date.UTC(2024, 2, 1));
		expect(nextPeriodStart(Date.UTC(2024, 6, 1), 'fy')).toBe(Date.UTC(2025, 6, 1));
		expect(dayStart(Date.UTC(2024, 0, 31, 23), 1)).toBe(Date.UTC(2024, 1, 1));
	});
	it('buffers daily fetches by three whole months either side of the viewport', () => {
		const bounds = { start: Date.UTC(1998, 11, 7), end: Date.UTC(2026, 8, 11) };
		expect(
			dailyFetchWindow({ start: Date.UTC(2025, 8, 11), end: Date.UTC(2026, 8, 11) }, bounds)
		).toEqual({ start: Date.UTC(2025, 5, 1), end: bounds.end });
		expect(
			dailyFetchWindow({ start: Date.UTC(2024, 0, 1), end: Date.UTC(2024, 11, 31) }, bounds)
		).toEqual({ start: Date.UTC(2023, 9, 1), end: Date.UTC(2025, 3, 1) });
		expect(
			dailyFetchWindow({ start: Date.UTC(1999, 0, 1), end: Date.UTC(2000, 0, 1) }, bounds).start
		).toBe(bounds.start);
	});
	it('ticks daily windows at month starts and labels the calendar', () => {
		const days = Array.from({ length: 70 }, (_, i) => ({
			time: dayStart(Date.UTC(2024, 11, 15), i),
			date: new Date(dayStart(Date.UTC(2024, 11, 15), i))
		}));
		const rows = aggregateComparison(days, '1d', Date.UTC(2025, 1, 10));
		expect(rows).toHaveLength(57);
		const ticks = comparisonTicks(rows, '1d').map((date) => date.getTime());
		expect(ticks).toEqual([Date.UTC(2025, 0, 1), Date.UTC(2025, 1, 1)]);
		const viewport = { start: days[0].time, end: days[0].time + DAILY_WINDOW_MS };
		expect(comparisonTickLabel(Date.UTC(2025, 0, 1), '1d', viewport)).toBe('Jan 2025');
		expect(comparisonTickLabel(Date.UTC(2025, 1, 1), '1d', viewport)).toBe('Feb');
		expect(comparisonTickLabel(days[0].time, '1d', viewport)).toBe('Dec');
		expect(comparisonTickLabel(Date.UTC(2025, 0, 15), '1d', viewport)).toBe('Jan');
		expect(comparisonTickLabel(Date.UTC(2025, 0, 1), '1M', viewport)).toBe('Jan 2025');
		expect(
			comparisonTickLabel(Date.UTC(2025, 0, 1), '12mr', { start: 0, end: 10 * DAILY_WINDOW_MS })
		).toBe('2025');
		expect(comparisonPeriod(Date.UTC(2024, 6, 16), '1d')).toBe('16 July 2024');
		expect(
			comparisonChartRows({ nsw1: days.slice(0, 3) }, ['nsw1'], 'share', 'demand', '1d')
		).toHaveLength(3);
		expect(comparisonFileName(normaliseRegionComparison({ interval: '1d' }), viewport, 'csv')).toBe(
			'tracker-regions-1d-2024-12-15-to-2025-12-14.csv'
		);
	});
	it('preserves the profile display, range and comparison state through shared navigation', () => {
		const original = parseTrackerUrl(
			new URLSearchParams('view=profile&profile-view=daily&range=30d'),
			{
				nowMs: start
			}
		);
		const state = {
			...original,
			view: /** @type {const} */ ('compare'),
			regionComparison: normaliseRegionComparison({ interval: '1M' })
		};
		const url = applyTrackerUrl(new URL('https://example.com/tracker'), state);
		expect(url.searchParams.get('view')).toBe('compare');
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
		const csv = regionComparisonCsv(dataset);
		expect(csv).toContain('Carbon intensity (kgCO2e/MWh)');
		expect(csv).toContain('gross demand (%)');
		expect(csv).toContain('Jan 2024,New South Wales,,150');
		const sheets = comparisonWorkbook(dataset, 'https://example.com/tracker?view=compare', state);
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
