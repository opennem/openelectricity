import { describe, it, expect } from 'vitest';
import { computeTrends, interpolateTrendValue, buildTrendHoverRows } from './trends';

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const KEY = 'renewables.energy.grouped';

/**
 * A perfectly linear monthly series rising `slopePerYear` per year.
 * @param {number} slopePerYear
 * @param {number} startValue
 * @param {number} months
 */
function linearDataset(slopePerYear, startValue, months) {
	const start = Date.UTC(2015, 0, 1);
	return Array.from({ length: months }, (_, i) => {
		const time = start + i * MONTH_MS;
		return {
			time,
			date: new Date(time),
			[KEY]: startValue + slopePerYear * ((time - start) / YEAR_MS)
		};
	});
}

describe('computeTrends', () => {
	it('anchors the trend at the last actual point', () => {
		const dataset = linearDataset(2, 30, 24);
		const last = dataset[dataset.length - 1];
		const toTime = last.time + 5 * YEAR_MS;

		const [trend] = computeTrends(dataset, [KEY], { toTime });

		expect(trend.key).toBe(KEY);
		expect(trend.points[0]).toEqual({ time: last.time, value: last[KEY] });
		expect(trend.points[1].time).toBe(toTime);
	});

	it('projects a linear series with the fitted slope', () => {
		const dataset = linearDataset(2, 30, 60); // +2 %/yr
		const last = dataset[dataset.length - 1];
		const toTime = last.time + 5 * YEAR_MS;

		const [trend] = computeTrends(dataset, [KEY], { toTime, windowYears: 10 });

		// last value + slope (2 %/yr) × 5 yr
		expect(trend.points[1].value).toBeCloseTo(last[KEY] + 2 * 5, 6);
	});

	it('clamps the projected endpoint to the supplied range', () => {
		const dataset = linearDataset(20, 80, 24); // shoots well past 100
		const last = dataset[dataset.length - 1];
		const toTime = last.time + 5 * YEAR_MS;

		const [trend] = computeTrends(dataset, [KEY], { toTime, clamp: [0, 100] });

		expect(trend.points[1].value).toBe(100);
	});

	it('fits only the trailing window when the series is long', () => {
		// Flat for years, then a steep recent rise — a recent-window fit should
		// track the rise, not the long flat history.
		const start = Date.UTC(2010, 0, 1);
		const dataset = Array.from({ length: 240 }, (_, i) => {
			const time = start + i * MONTH_MS;
			const years = (time - start) / YEAR_MS;
			const value = years < 15 ? 20 : 20 + (years - 15) * 6; // rises 6 %/yr in last 5 yr
			return { time, date: new Date(time), [KEY]: value };
		});
		const last = dataset[dataset.length - 1];
		const toTime = last.time + 1 * YEAR_MS;

		const recent = computeTrends(dataset, [KEY], { toTime, windowYears: 4 })[0];
		const full = computeTrends(dataset, [KEY], { toTime, windowYears: 100 })[0];

		// Recent window sees the steep rise; full history is dragged flat.
		expect(recent.points[1].value).toBeGreaterThan(full.points[1].value);
		expect(recent.points[1].value - last[KEY]).toBeCloseTo(6, 0);
	});

	it('skips series with insufficient data and bad inputs', () => {
		expect(computeTrends([], [KEY], { toTime: 1 })).toEqual([]);

		const oneRow = [
			{ time: Date.UTC(2020, 0, 1), date: new Date(Date.UTC(2020, 0, 1)), [KEY]: 50 }
		];
		expect(computeTrends(oneRow, [KEY], { toTime: Date.UTC(2030, 0, 1) })).toEqual([]);

		// toTime before the last point → nothing to project
		const dataset = linearDataset(2, 30, 24);
		expect(computeTrends(dataset, [KEY], { toTime: dataset[0].time })).toEqual([]);
	});
});

describe('interpolateTrendValue', () => {
	const trend = {
		points: [
			{ time: 0, value: 40 },
			{ time: 100, value: 60 }
		]
	};

	it('returns the endpoint values at and beyond the bounds', () => {
		expect(interpolateTrendValue(trend, -50)).toBe(40);
		expect(interpolateTrendValue(trend, 0)).toBe(40);
		expect(interpolateTrendValue(trend, 100)).toBe(60);
		expect(interpolateTrendValue(trend, 150)).toBe(60);
	});

	it('interpolates linearly between the bounds', () => {
		expect(interpolateTrendValue(trend, 50)).toBe(50);
		expect(interpolateTrendValue(trend, 25)).toBe(45);
	});
});

describe('buildTrendHoverRows', () => {
	const FOSSIL = 'fossil_fuels.energy.grouped';
	const anchor = Date.UTC(2026, 0, 1);
	const end = Date.UTC(2035, 0, 1);
	/** @type {any} */
	const trends = [
		{
			key: KEY,
			points: [
				{ time: anchor, value: 40 },
				{ time: end, value: 70 }
			]
		},
		{
			key: FOSSIL,
			points: [
				{ time: anchor, value: 55 },
				{ time: end, value: 25 }
			]
		}
	];

	it('returns no rows when there are no trends', () => {
		expect(buildTrendHoverRows([])).toEqual([]);
	});

	it('spans the projected region one month past the anchor', () => {
		const rows = buildTrendHoverRows(trends);

		expect(rows.length).toBeGreaterThan(0);
		expect(rows[0].time).toBeGreaterThan(anchor); // never collides with the last real point
		expect(rows[rows.length - 1].time).toBeLessThanOrEqual(end);
	});

	it('flags rows and carries an interpolated value per series key', () => {
		const rows = buildTrendHoverRows(trends);
		const last = rows[rows.length - 1];

		for (const row of rows) {
			expect(row.isTrend).toBe(true);
			expect(typeof row.time).toBe('number');
			expect(row.date instanceof Date).toBe(true);
		}
		// Renewables climbs, fossils falls — both reach close to their endpoints.
		expect(Number(last[KEY])).toBeGreaterThan(Number(rows[0][KEY]));
		expect(Number(last[FOSSIL])).toBeLessThan(Number(rows[0][FOSSIL]));
		expect(Number(last[KEY])).toBeCloseTo(70, 0);
		expect(Number(last[FOSSIL])).toBeCloseTo(25, 0);
	});
});
