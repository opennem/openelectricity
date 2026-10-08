import { comparisonYDomain } from './region-comparison.js';
import { describe, expect, it } from 'vitest';
import {
	COMPARISON_DISPLAYS,
	comparisonDisplay,
	comparisonRangeLabel,
	comparisonTickLabel,
	nextPeriodStart,
	periodMonths,
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
		const rows = comparisonChartRows(data, ['nsw1'], 'renewables_generation', 'demand', 1);
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
		expect(comparisonMetricValue(rows[0], 'renewables_generation', 'demand')).toBe(18000);
		expect(comparisonMetricValue(rows[0], 'renewables_share', 'demand')).toBe(150);
		expect(comparisonMetricValue(rows[0], 'renewables_share', 'generation')).toBe(75);
	});
	it('preserves zero numerators and rejects non-positive or missing denominators', () => {
		const zero = { emissions: 0, energy_mwh: 10, renewables: 0, demand_gross: 10 };
		expect(
			['intensity', 'renewables_generation', 'renewables_share'].map((id) =>
				comparisonMetricValue(zero, id, 'demand')
			)
		).toEqual([0, 0, 0]);
		const bad = { emissions: 5, energy_mwh: 0, renewables: 10, demand_gross: -1 };
		expect(
			['intensity', 'renewables_generation', 'renewables_share'].map((id) =>
				comparisonMetricValue(bad, id, 'demand')
			)
		).toEqual([null, 10, null]);
		expect(
			['intensity', 'renewables_generation', 'renewables_share'].map((id) =>
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
	it('sums complete seasons, quarters and halves, as Timeline buckets them', () => {
		const end = Date.UTC(2026, 0);
		// Summer 2023/24 lacks December 2023 and summer 2025/26 its Jan–Feb.
		const seasons = aggregateComparison(monthly(), 'season', end);
		expect(seasons.map((row) => row.time)).toEqual(
			[2, 5, 8, 11, 14, 17, 20].map((months) => monthStart(start, months))
		);
		expect(seasons[0].renewables).toBe(4500);
		expect(comparisonPeriod(Date.UTC(2024, 11), 'season')).toBe('Summer 2024/25');
		expect(aggregateComparison(monthly(), 'quarter', end)).toHaveLength(8);
		expect(comparisonPeriod(Date.UTC(2025, 3), 'quarter')).toBe('Q2 2025');
		const halves = aggregateComparison(monthly(), 'half', end);
		expect(halves.map((row) => row.renewables)).toEqual([9000, 9000, 9000, 9000]);
		expect(comparisonPeriod(Date.UTC(2025, 6), 'half')).toBe('H2 2025');
		const missing = monthly();
		missing[4].renewables = null;
		expect(aggregateComparison(missing, 'quarter', end)[1].renewables).toBeNull();
	});
	it('samples the 12-month rolling sum as each season, quarter or half closes', () => {
		const rows = aggregateComparison(monthly(), '12mr-season', Date.UTC(2026, 0));
		// Windows ending Feb, May, Aug and Nov 2025, dated by their last season's start.
		expect(rows.map((row) => row.time)).toEqual([
			Date.UTC(2024, 11),
			Date.UTC(2025, 2),
			Date.UTC(2025, 5),
			Date.UTC(2025, 8)
		]);
		expect(rows.every((row) => row.renewables === 18000)).toBe(true);
		expect(comparisonPeriod(rows[0].time, '12mr-season')).toBe('12 months to Summer 2024/25');
		// Halves close in Dec 2024, Jun 2025 and Dec 2025.
		expect(
			aggregateComparison(monthly(), '12mr-half', Date.UTC(2026, 0)).map((row) => row.time)
		).toEqual([Date.UTC(2024, 6), Date.UTC(2025, 0), Date.UTC(2025, 6)]);
		expect(comparisonPeriod(Date.UTC(2025, 6), '12mr-half')).toBe('12 months to H2 2025');
		expect(comparisonPeriod(Date.UTC(2025, 6), '12mr')).toBe('12 months to July 2025');
	});
	it('keeps one calendar period a year under a filter', () => {
		const end = Date.UTC(2026, 0);
		expect(aggregateComparison(monthly(), '1M', end, 'jan').map((row) => row.time)).toEqual([
			Date.UTC(2024, 0),
			Date.UTC(2025, 0)
		]);
		expect(aggregateComparison(monthly(), 'quarter', end, 'q3').map((row) => row.time)).toEqual([
			Date.UTC(2024, 6),
			Date.UTC(2025, 6)
		]);
		expect(
			aggregateComparison(monthly(), '12mr-season', end, 'summer').map((row) => row.time)
		).toEqual([Date.UTC(2024, 11)]);
		// A filtered row spans to the same period next year.
		expect(periodMonths('season')).toBe(3);
		expect(periodMonths('12mr-half')).toBe(6);
		expect(periodMonths('season', 'summer')).toBe(12);
		expect(nextPeriodStart(Date.UTC(2024, 2), periodMonths('season'))).toBe(Date.UTC(2024, 5));
		expect(nextPeriodStart(Date.UTC(2024, 2), periodMonths('season', 'autumn'))).toBe(
			Date.UTC(2025, 2)
		);
	});
	it('validates the filter against the grain and round-trips it in the URL', () => {
		expect(normaliseRegionComparison({ interval: '1M', filter: 'jan' }).filter).toBe('jan');
		expect(normaliseRegionComparison({ interval: '12mr', filter: 'jan' }).filter).toBe('jan');
		expect(normaliseRegionComparison({ interval: 'season', filter: 'jan' }).filter).toBeNull();
		expect(normaliseRegionComparison({ interval: 'fy', filter: 'jan' }).filter).toBeNull();
		expect(normaliseRegionComparison({ interval: 'bogus' }).interval).toBe('12mr');
		const state = normaliseRegionComparison({ interval: '12mr-quarter', filter: 'q2' });
		const params = new URLSearchParams();
		applyRegionComparison(params, state);
		expect(params.get('compare-interval')).toBe('12mr-quarter');
		expect(params.get('compare-filter')).toBe('q2');
		expect(parseRegionComparison(params)).toEqual(state);
		applyRegionComparison(params, normaliseRegionComparison({}));
		expect(params.has('compare-filter')).toBe(false);
	});
	it('ticks coarse rows at each year’s first row, a year step apart', () => {
		const seasons = Array.from({ length: 12 }, (_, i) => ({ time: monthStart(start, 2 + i * 3) }));
		expect(
			comparisonTicks(/** @type {any[]} */ (seasons), 3).map((date) => date.getTime())
		).toEqual([Date.UTC(2024, 2), Date.UTC(2025, 2), Date.UTC(2026, 2)]);
		expect(comparisonRangeLabel(Date.UTC(2024, 2), Date.UTC(2025, 8), 'season')).toBe(
			'Autumn 2024 — Spring 2025'
		);
		expect(comparisonRangeLabel(Date.UTC(2024, 11), Date.UTC(2025, 8), '12mr-season')).toBe(
			'Summer 2024/25 — Spring 2025'
		);
	});
	it('only includes complete months and years and uses July financial years', () => {
		const data = monthly();
		expect(aggregateComparison(data, '1M', Date.UTC(2024, 5))).toHaveLength(5);
		expect(aggregateComparison(data, '1y', Date.UTC(2025, 5))).toHaveLength(1);
		const financial = aggregateComparison(data, 'fy', Date.UTC(2026, 0));
		const complete = financial.find((row) => row.time === Date.UTC(2024, 6));
		expect(complete.renewables).toBe(18000);
		expect(comparisonPeriod(complete.time, 'fy')).toBe('FY2025');
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
		// A null between two readings is missing: that month's generation is unknown.
		const gap = response('+10:00');
		for (const entry of gap.data)
			for (const series of entry.results)
				series.data.push(
					['2024-02-01T00:00:00+10:00', series.data[0][1]],
					['2024-03-01T00:00:00+10:00', series.data[0][1]]
				);
		gap.data[1].results[1].data[1][1] = null;
		const months = processComparisonEnergy(gap)?.data ?? [];
		expect(months.map((row) => row.generation_mwh)).toEqual([2000, null, 2000]);
		// A technology that idles (explicit zeros elsewhere) reports idle months
		// as null too: they count as zero, so the month stays known.
		const idle = response('+10:00');
		for (const entry of idle.data)
			for (const series of entry.results)
				series.data.push(
					['2024-02-01T00:00:00+10:00', series.data[0][1]],
					['2024-03-01T00:00:00+10:00', 0]
				);
		idle.data[1].results[0].data[1][1] = null;
		const idleMonths = processComparisonEnergy(idle)?.data ?? [];
		expect(idleMonths[1].generation_mwh).toBe(1000);
		expect(idleMonths[1].energy_mwh).not.toBeNull();
		// The null the API pads a new technology with is absent, not missing.
		const padded = response('+10:00');
		padded.data[1].results[1].data = [
			['2024-01-01T00:00:00+10:00', null],
			['2024-02-01T00:00:00+10:00', 1000]
		];
		const rows = processComparisonEnergy(padded)?.data ?? [];
		expect(rows[0].generation_mwh).toBe(1000);
		expect(rows[0].energy_mwh).not.toBeNull();
	});
	it('selects a common completed period without mixing region dates', () => {
		const data = { a: monthly(12), b: monthly(10) };
		const viewport = { start, end: Date.UTC(2025, 0) };
		const charts = ['intensity', 'renewables_share'];
		expect(latestCommonComparisonPeriod(data, ['a', 'b'], 'demand', viewport, charts)).toBe(
			Date.UTC(2024, 9)
		);
		// A region still loading or failed (no rows) no longer blanks the rest.
		expect(latestCommonComparisonPeriod(data, ['a', 'missing'], 'demand', viewport, charts)).toBe(
			Date.UTC(2024, 11)
		);
		expect(latestCommonComparisonPeriod(data, ['missing'], 'demand', viewport, charts)).toBeNull();
		expect(latestCommonComparisonPeriod(data, [], 'demand', viewport, charts)).toBeNull();
		expect(latestCommonComparisonPeriod(data, ['a', 'b'], 'demand', viewport, [])).toBeNull();
	});
	describe('the Regions table’s resting period with a fuel value shown', () => {
		const viewport = { start, end: Date.UTC(2026, 0) };
		const charts = ['intensity', 'coal_value'];
		/** Coal value from `from` to `to` (month indexes), none otherwise. @param {number} [from] @param {number} [to] */
		const coal = (from = 0, to = 23) =>
			monthly(24).map((row, i) =>
				i >= from && i <= to ? { ...row, coal_energy: 1000, coal_market_value: 80_000 } : row
			);
		it('ignores a region that never had the fuel', () => {
			// Tasmania has no coal: its coal value is never a reason to go back.
			const data = { nsw1: coal(), tas1: monthly(24) };
			expect(latestCommonComparisonPeriod(data, ['nsw1', 'tas1'], 'demand', viewport, charts)).toBe(
				Date.UTC(2025, 11)
			);
		});
		it('ignores a fuel that ended long before the view’s latest year', () => {
			// South Australia's coal stopped years ago: no pinning to its last month.
			const data = { nsw1: coal(), sa1: coal(0, 3) };
			expect(latestCommonComparisonPeriod(data, ['nsw1', 'sa1'], 'demand', viewport, charts)).toBe(
				Date.UTC(2025, 11)
			);
		});
		it('still steps back for a value lagging within the latest year', () => {
			// Two months short at the end: the table reads the last complete month.
			const data = { nsw1: coal(0, 21), vic1: coal() };
			expect(latestCommonComparisonPeriod(data, ['nsw1', 'vic1'], 'demand', viewport, charts)).toBe(
				Date.UTC(2025, 9)
			);
		});
		it('spans two periods at coarser grains', () => {
			// Yearly rows: a value missing only from the latest year still holds it back.
			const yearly = [0, 1, 2].map((i) => ({
				...monthly(1)[0],
				time: Date.UTC(2023 + i, 0),
				coal_energy: 1000,
				coal_market_value: i === 2 ? null : 80_000
			}));
			const range = { start: Date.UTC(2023, 0), end: Date.UTC(2026, 0) };
			expect(
				latestCommonComparisonPeriod({ nsw1: yearly }, ['nsw1'], 'demand', range, charts, 12)
			).toBe(Date.UTC(2024, 0));
		});
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
		expect(comparisonTicks(years, 12).map((date) => date.getUTCFullYear())).toEqual([
			2000, 2005, 2010, 2015, 2020, 2025
		]);
		// A narrow panel asks for fewer, still on the calendar.
		expect(comparisonTicks(visible, 1, 3).map((date) => date.getUTCMonth())).toEqual([6, 0]);
		expect(comparisonTicks(years, 12, 3).map((date) => date.getUTCFullYear())).toEqual([
			2000, 2010, 2020
		]);
	});
	it('reads the periods on screen as a first-to-last range', () => {
		const first = Date.UTC(1999, 0, 1);
		expect(comparisonRangeLabel(first, Date.UTC(2026, 7, 1), '1M')).toBe('Jan 1999 — Aug 2026');
		expect(comparisonRangeLabel(first, Date.UTC(2026, 7, 1), '12mr')).toBe('Jan 1999 — Aug 2026');
		expect(comparisonRangeLabel(first, Date.UTC(2025, 0, 1), '1y')).toBe('1999 — 2025');
		// Financial years by their closing year: 1999–00 is FY2000.
		expect(comparisonRangeLabel(Date.UTC(1999, 6, 1), Date.UTC(2025, 6, 1), 'fy')).toBe(
			'FY2000 — FY2026'
		);
		expect(comparisonRangeLabel(Date.UTC(2024, 0), Date.UTC(2024, 0), '1M')).toBe('Jan 2024');
		expect(comparisonRangeLabel(null, null, '1M')).toBe('');
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
		expect(
			latestCommonComparisonPeriod(data, ['a', 'b'], 'demand', viewport, ['renewables_share'])
		).toBe(Date.UTC(2024, 9));
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
				basis: 'generation',
				table: false,
				regions,
				start,
				end: Date.UTC(2025, 0)
			});
			const params = new URLSearchParams();
			applyRegionComparison(params, state);
			expect(params.get('compare-display')).toBe('heatmap');
			expect(parseRegionComparison(params)).toEqual(state);
		}
		// Every display round-trips through its slug, Trends by omission.
		for (const { value, slug } of COMPARISON_DISPLAYS) {
			const state = normaliseRegionComparison({ display: value });
			const params = new URLSearchParams();
			applyRegionComparison(params, state);
			expect(params.get('compare-display') ?? '').toBe(slug);
			expect(parseRegionComparison(params).display).toBe(value);
		}
		expect(COMPARISON_DISPLAYS.map(({ slug }) => slug)).toEqual(['', 'panels', 'ranks', 'heatmap']);
		// Older links named the heatmap `stripes`.
		expect(parseRegionComparison(new URLSearchParams('compare-display=stripes')).display).toBe(
			'stripes'
		);
		expect(parseRegionComparison(new URLSearchParams('compare-display=bogus')).display).toBe(
			'charts'
		);
		expect(normaliseRegionComparison({ display: 'bogus' }).display).toBe('charts');
		expect(comparisonDisplay('bogus')).toBe(COMPARISON_DISPLAYS[0]);
		const params = new URLSearchParams();
		applyRegionComparison(params, normaliseRegionComparison({}));
		expect(params.has('compare-display')).toBe(false);
	});
	it('writes short region and chart names, and still reads the full ids', () => {
		const state = normaliseRegionComparison({
			regions: ['nsw1', 'wem', '_all', 'au'],
			charts: [
				'intensity',
				'renewables_share',
				'solar_wind_generation',
				'net_imports_share',
				'price_real'
			]
		});
		const params = new URLSearchParams();
		applyRegionComparison(params, state);
		expect(params.get('compare-regions')).toBe('nsw,wem,nem,au');
		expect(params.get('compare-charts')).toBe(
			'intensity,net-imports,renewables,solar-wind-generation,price-real'
		);
		expect(parseRegionComparison(params)).toEqual(state);
		const legacy = new URLSearchParams(
			'compare-regions=nsw1,wem&compare-charts=intensity,solar_generation'
		);
		expect(parseRegionComparison(legacy)).toMatchObject({
			regions: ['nsw1', 'wem'],
			charts: ['intensity', 'solar_generation']
		});
	});
	it('bounds history at the last complete month in both networks', () => {
		const bounds = comparisonBounds(Date.UTC(2026, 8, 17, 20));
		expect(bounds.end).toBe(Date.UTC(2026, 8, 1));
		expect(nextPeriodStart(Date.UTC(2024, 1, 1), periodMonths('1M'))).toBe(Date.UTC(2024, 2, 1));
		expect(nextPeriodStart(Date.UTC(2024, 6, 1), periodMonths('fy'))).toBe(Date.UTC(2025, 6, 1));
	});
	it('labels ticks with months below three years and years beyond', () => {
		const year = { start: Date.UTC(2024, 11, 15), end: Date.UTC(2025, 11, 15) };
		expect(comparisonTickLabel(Date.UTC(2025, 0, 1), year)).toBe('Jan 2025');
		expect(comparisonTickLabel(Date.UTC(2025, 0, 1), { start: 0, end: Date.UTC(2010, 0) })).toBe(
			'2025'
		);
		expect(comparisonFileName(normaliseRegionComparison({ interval: '1M' }), year, 'csv')).toBe(
			'tracker-regions-1m-2024-12-to-2025-12.csv'
		);
	});
	it('preserves the profile window, range and comparison state through shared navigation', () => {
		const original = parseTrackerUrl(new URLSearchParams('profile-days=14&range=30d'), {
			nowMs: start
		});
		const state = {
			...original,
			regionComparison: normaliseRegionComparison({ interval: '1M' })
		};
		const url = applyTrackerUrl(new URL('https://example.com/tracker/compare'), state);
		expect(url.searchParams.has('view')).toBe(false);
		const restored = parseTrackerUrl(url.searchParams, { nowMs: start });
		expect(restored.range).toEqual(original.range);
		expect(restored.profileDays).toBe(14);
		expect(restored.regionComparison?.interval).toBe('1M');
	});
	it('exports period, region, base units and the chosen denominator with blank missing values', () => {
		const state = normaliseRegionComparison({
			regions: ['nsw1'],
			interval: '1M',
			charts: ['intensity', 'renewables_share']
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
