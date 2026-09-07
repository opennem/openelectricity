import { describe, it, expect } from 'vitest';
import {
	createContributionContext,
	contributionPercent,
	contributionSeries
} from './contribution.js';
import { getGroup, GROUP_OPTIONS, loadGroupsFor } from './groups.js';
import { DEMAND_GROSS_SERIES_ID } from './market-series-ids.js';
import { createVisibleAggregation } from '../v2/display-aggregation.js';

const row = { time: 1, date: new Date(1), coal: 60, wind: 40, imports: 20, battery_charging: -10 };
const names = ['coal', 'wind', 'imports', 'battery_charging'];
const base = {
	generationRows: [row],
	demandRows: [{ ...row, [DEMAND_GROSS_SERIES_ID]: 80 }],
	seriesNames: names,
	loadSeriesIds: ['battery_charging']
};

describe('contribution percentages', () => {
	it('uses all sources, excludes imports and loads only from generation membership', () => {
		const generation = createContributionContext({ ...base, mode: 'generation' });
		expect(generation.transform(row, ['wind']).wind).toBe(40);
		expect(generation.excludedSeriesNames).toEqual(['imports', 'battery_charging']);
		const demand = createContributionContext({ ...base, mode: 'demand' });
		expect(demand.transform(row, names)).toMatchObject({ coal: 75, wind: 50, imports: 25 });
		expect(demand.excludedSeriesNames).toEqual(['battery_charging']);
	});

	it.each([null, undefined, 0, -1, NaN, Infinity])(
		'leaves invalid denominator %s unavailable',
		(denominator) => {
			expect(contributionPercent(10, denominator)).toBeNull();
		}
	);

	it('preserves true zeros and values above 100%, but not absent numerators', () => {
		expect(contributionPercent(0, 10)).toBe(0);
		expect(contributionPercent(12, 10)).toBe(120);
		expect(contributionPercent(null, 10)).toBeNull();
		expect(contributionPercent(Infinity, 10)).toBeNull();
	});

	it('withholds unready, absent and wrong-timestamp demand instead of falling back', () => {
		for (const input of [
			{ ready: false },
			{ demandRows: [] },
			{ demandRows: [{ time: 2, [DEMAND_GROSS_SERIES_ID]: 100 }] }
		]) {
			const context = createContributionContext({ ...base, mode: 'demand', ...input });
			expect(context.transform(row, ['wind']).wind).toBeNull();
		}
	});

	it('keeps an all-missing or non-finite source denominator unavailable', () => {
		for (const missing of [
			{ coal: null, wind: null },
			{ coal: Infinity, wind: 10 }
		]) {
			const context = createContributionContext({
				...base,
				generationRows: [{ ...row, ...missing }],
				mode: 'generation'
			});
			expect(context.transform({ ...row, demand: 100 }, ['demand']).demand).toBeNull();
		}
	});

	it.each(GROUP_OPTIONS.map(({ value }) => value))(
		'uses the table membership for %s grouping',
		(group) => {
			const config = getGroup(group);
			const keys = Object.keys(config.fuelTechs);
			const loads = loadGroupsFor(config);
			const included = contributionSeries(keys, loads, 'generation');
			const grouped = {
				time: 1,
				date: new Date(1),
				...Object.fromEntries(keys.map((key) => [key, 10]))
			};
			const context = createContributionContext({
				generationRows: [grouped],
				demandRows: [],
				seriesNames: keys,
				loadSeriesIds: loads,
				mode: 'generation'
			});
			for (const key of included)
				expect(context.transform(grouped, keys)[key]).toBeCloseTo(100 / included.length);
			expect(context.excludedSeriesNames).toEqual(keys.filter((key) => !included.includes(key)));
		}
	);

	it.each(['half', '12mr'])(
		'divides aggregated sums, not average ratios, for %s',
		(displayInterval) => {
			const start = Date.UTC(2023, 0, 1);
			const samples = Array.from({ length: 24 }, (_, i) => ({
				time: Date.UTC(2023, i, 1),
				date: new Date(Date.UTC(2023, i, 1)),
				wind: i % 2 ? 90 : 10,
				[DEMAND_GROSS_SERIES_ID]: i % 2 ? 100 : 50
			}));
			const opts = {
				viewStart: start,
				viewEnd: Date.UTC(2024, 11, 31),
				apiInterval: '1M',
				displayInterval,
				ianaTimeZone: 'UTC',
				method: /** @type {const} */ ('sum')
			};
			const generationRows = createVisibleAggregation()(
				{ data: samples, seriesNames: ['wind'] },
				opts
			);
			const demandRows = createVisibleAggregation()(
				{ data: samples, seriesNames: [DEMAND_GROSS_SERIES_ID] },
				opts
			);
			const context = createContributionContext({
				generationRows,
				demandRows,
				seriesNames: ['wind'],
				loadSeriesIds: [],
				mode: 'demand'
			});
			expect(generationRows.length).toBeGreaterThan(0);
			for (const sample of generationRows)
				expect(context.transform(sample, ['wind']).wind).toBeCloseTo((100 * 100) / 150);
		}
	);
});
