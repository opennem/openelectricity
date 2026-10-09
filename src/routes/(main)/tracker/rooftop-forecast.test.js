import { describe, expect, it } from 'vitest';
import {
	forecastQuery,
	forecastRows,
	formatRunTime,
	hasRooftopForecast
} from './rooftop-forecast.js';

const AEST = '+10:00';
/** 9 October 2026 12:10 AEST. */
const NOW = Date.parse('2026-10-09T12:10:00+10:00');

describe('hasRooftopForecast', () => {
	it('covers the NEM and its regions only', () => {
		for (const region of ['_all', 'nsw1', 'qld1', 'sa1', 'tas1', 'vic1']) {
			expect(hasRooftopForecast(region)).toBe(true);
		}
		expect(hasRooftopForecast('wem')).toBe(false);
		expect(hasRooftopForecast('au')).toBe(false);
	});
});

describe('forecastQuery', () => {
	it('asks for native 30-minute slots on half-hour-aligned local bounds', () => {
		const params = new URLSearchParams(forecastQuery('sa1', NOW, AEST));
		expect(Object.fromEntries(params)).toEqual({
			region: 'sa1',
			metric: 'rooftop_forecast',
			interval: '30m',
			// Two hours back, floored to the half-hour: 10:10 → 10:00.
			date_start: '2026-10-09T10:00:00',
			// Up to the slot covering now (12:00), never further ahead.
			date_end: '2026-10-09T12:30:00'
		});
	});

	it('gives every reader in the same half-hour the same query', () => {
		expect(forecastQuery('_all', NOW, AEST)).toBe(
			forecastQuery('_all', Date.parse('2026-10-09T12:25:00+10:00'), AEST)
		);
	});
});

describe('forecastRows', () => {
	it('reads the forecast series and the AEMO run time', () => {
		const { rows, runTime } = forecastRows({
			data: [
				{
					metric: 'solar_rooftop_forecast',
					forecast_run_time: '2026-10-09T12:00:00+10:00',
					results: [
						{
							data: [
								['2026-10-09T12:30:00+10:00', 16_000],
								['2026-10-09T12:00:00+10:00', 16_530],
								['2026-10-09T13:00:00+10:00', null]
							]
						}
					]
				}
			]
		});
		expect(rows).toEqual([
			{ time: Date.parse('2026-10-09T12:00:00+10:00'), value: 16_530 },
			{ time: Date.parse('2026-10-09T12:30:00+10:00'), value: 16_000 }
		]);
		expect(runTime).toBe(Date.parse('2026-10-09T12:00:00+10:00'));
	});

	it('returns nothing for a missing or empty response', () => {
		expect(forecastRows(null)).toEqual({ rows: [], runTime: null });
		expect(forecastRows({ data: [] })).toEqual({ rows: [], runTime: null });
	});
});

describe('formatRunTime', () => {
	it('shows the run in local time', () => {
		expect(formatRunTime(Date.parse('2026-10-09T02:00:00Z'), AEST)).toBe('12:00');
	});
});
