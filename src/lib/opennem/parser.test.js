import { describe, it, expect } from 'vitest';
import parser from './parser.js';

/**
 * @param {Partial<StatsData>} overrides
 * @returns {StatsData}
 */
function makeStats(overrides = {}) {
	return /** @type {StatsData} */ ({
		id: 'test',
		fuel_tech: 'solar_utility',
		data_type: 'energy',
		type: 'energy',
		units: 'GWh',
		history: {
			start: '2010-01-01T00:00:00+10:00',
			last: '2010-04-01T00:00:00+10:00',
			interval: '1M',
			data: [10, 20, 30, 40]
		},
		...overrides
	});
}

describe('parser', () => {
	it('filters by data_type', () => {
		const data = [
			makeStats({ fuel_tech: 'solar_utility', data_type: 'energy' }),
			makeStats({ fuel_tech: 'solar_utility', data_type: 'capacity' })
		];
		const result = parser(data, 'energy');
		expect(result).toHaveLength(1);
		expect(result[0].data_type).toBe('energy');
	});

	it('excludes curtailment fuel techs', () => {
		const data = [
			makeStats({ fuel_tech: 'solar_curtailment', data_type: 'energy' }),
			makeStats({ fuel_tech: 'solar_utility', data_type: 'energy' })
		];
		const result = parser(data, 'energy');
		expect(result).toHaveLength(1);
		expect(result[0].fuel_tech).toBe('solar_utility');
	});

	it('pads start with nulls when fuel tech starts later than coal_black reference', () => {
		const data = [
			makeStats({
				fuel_tech: 'coal_black',
				data_type: 'energy',
				history: {
					start: '2010-01-01T00:00:00+10:00',
					last: '2010-04-01T00:00:00+10:00',
					interval: '1M',
					data: [100, 200, 300, 400]
				}
			}),
			makeStats({
				fuel_tech: 'solar_utility',
				data_type: 'energy',
				history: {
					start: '2010-03-01T00:00:00+10:00',
					last: '2010-04-01T00:00:00+10:00',
					interval: '1M',
					data: [30, 40]
				}
			})
		];

		const result = parser(data, 'energy');
		const solar = result.find((d) => d.fuel_tech === 'solar_utility');

		// Solar should be padded with 2 nulls at the start to align to coal_black's start
		expect(solar.history.data).toEqual([null, null, 30, 40]);
		expect(solar.history.start).toBe('2010-01-01T00:00:00+10:00');
	});

	it('pads end with nulls when fuel tech ends earlier than coal_black reference', () => {
		const data = [
			makeStats({
				fuel_tech: 'coal_black',
				data_type: 'energy',
				history: {
					start: '2010-01-01T00:00:00+10:00',
					last: '2010-06-01T00:00:00+10:00',
					interval: '1M',
					data: [100, 200, 300, 400, 500, 600]
				}
			}),
			makeStats({
				fuel_tech: 'solar_utility',
				data_type: 'energy',
				history: {
					start: '2010-01-01T00:00:00+10:00',
					last: '2010-03-01T00:00:00+10:00',
					interval: '1M',
					data: [10, 20, 30]
				}
			})
		];

		const result = parser(data, 'energy');
		const solar = result.find((d) => d.fuel_tech === 'solar_utility');

		// Solar should be padded with 3 nulls at the end to match coal_black's last date
		expect(solar.history.data).toEqual([10, 20, 30, null, null, null]);
		expect(solar.history.last).toBe('2010-06-01T00:00:00+10:00');
	});

	it('uses fallback dates when coal_black is absent (e.g. TAS)', () => {
		const data = [
			makeStats({
				fuel_tech: 'hydro',
				data_type: 'energy',
				history: {
					start: '2010-01-01T00:00:00+10:00',
					last: '2010-04-01T00:00:00+10:00',
					interval: '1M',
					data: [10, 20, 30, 40]
				}
			})
		];

		const result = parser(data, 'energy');
		const hydro = result.find((d) => d.fuel_tech === 'hydro');

		// Without coal_black, fallback start is 1998-12-01
		// hydro starts at 2010-01 — should be padded at start
		expect(hydro.history.start).toBe('1998-12-01');
		expect(hydro.history.data[0]).toBeNull(); // padded null
		// Original data should appear after the null padding
		const originalIndex = hydro.history.data.indexOf(10);
		expect(originalIndex).toBeGreaterThan(0);
		expect(hydro.history.data[originalIndex]).toBe(10);
		expect(hydro.history.data[originalIndex + 1]).toBe(20);
	});

	it('returns empty array for null/undefined input', () => {
		expect(parser(null, 'energy')).toEqual([]);
		expect(parser(undefined, 'energy')).toEqual([]);
	});

	it('handles fuel techs with both start and end padding needed', () => {
		const data = [
			makeStats({
				fuel_tech: 'coal_black',
				data_type: 'energy',
				history: {
					start: '2010-01-01T00:00:00+10:00',
					last: '2010-06-01T00:00:00+10:00',
					interval: '1M',
					data: [100, 200, 300, 400, 500, 600]
				}
			}),
			makeStats({
				fuel_tech: 'wind',
				data_type: 'energy',
				history: {
					start: '2010-03-01T00:00:00+10:00',
					last: '2010-04-01T00:00:00+10:00',
					interval: '1M',
					data: [30, 40]
				}
			})
		];

		const result = parser(data, 'energy');
		const wind = result.find((d) => d.fuel_tech === 'wind');

		// Wind starts 2 months after coal, ends 2 months before coal
		// Should be padded on both sides
		expect(wind.history.data).toEqual([null, null, 30, 40, null, null]);
		expect(wind.history.start).toBe('2010-01-01T00:00:00+10:00');
		expect(wind.history.last).toBe('2010-06-01T00:00:00+10:00');
	});
});
