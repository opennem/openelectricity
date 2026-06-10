import { describe, it, expect } from 'vitest';
import { processFacilityPower } from './process-facility-power.js';

/**
 * Minimal facility power API response: two units at 5-minute steps, timestamps
 * in network-local time with the offset suffix (as the real API returns).
 * @param {string} offset
 */
function buildResponse(offset = '+10:00') {
	return {
		data: [
			{
				metric: 'power',
				interval: '5m',
				results: [
					{
						name: 'power_UNIT1',
						columns: { unit_code: 'UNIT1' },
						data: [
							[`2026-02-08T10:00:00${offset}`, 100],
							[`2026-02-08T10:05:00${offset}`, 110]
						]
					},
					{
						name: 'power_LOAD1',
						columns: { unit_code: 'LOAD1' },
						data: [[`2026-02-08T10:00:00${offset}`, 40]]
					}
				]
			}
		]
	};
}

const config = {
	unitFuelTechMap: { UNIT1: 'coal_black', LOAD1: 'battery_charging' },
	unitOrder: ['power_UNIT1', 'power_LOAD1'],
	loadsToInvert: ['power_LOAD1'],
	getLabel: (/** @type {string} */ code) => `${code} label`,
	getColour: () => '#abcdef',
	metricFilter: 'power',
	networkTimezone: '+10:00'
};

describe('processFacilityPower', () => {
	it('builds chart-ready rows keyed by real timestamps', () => {
		const result = processFacilityPower(buildResponse(), config);
		expect(result).not.toBeNull();
		const { data, seriesNames } = /** @type {any} */ (result);

		expect(seriesNames).toEqual(['power_UNIT1', 'power_LOAD1']);
		// Union of timestamps (UNIT1 has 2, LOAD1 has 1) → 2 rows.
		expect(data).toHaveLength(2);
		expect(data[0]).toHaveProperty('time');
		expect(data[0]).toHaveProperty('date');
		// First row parsed at 10:00 AEST = 00:00 UTC.
		expect(data[0].time).toBe(Date.UTC(2026, 1, 8, 0, 0));
	});

	it('inverts load series and null-fills missing timestamps', () => {
		const { data } = /** @type {any} */ (processFacilityPower(buildResponse(), config));
		expect(data[0].power_UNIT1).toBe(100);
		expect(data[0].power_LOAD1).toBe(-40); // inverted
		// Second timestamp has no LOAD1 value → null.
		expect(data[1].power_UNIT1).toBe(110);
		expect(data[1].power_LOAD1).toBeNull();
	});

	it('honours unitOrder regardless of API order', () => {
		const { seriesNames } = /** @type {any} */ (
			processFacilityPower(buildResponse(), {
				...config,
				unitOrder: ['power_LOAD1', 'power_UNIT1']
			})
		);
		expect(seriesNames).toEqual(['power_LOAD1', 'power_UNIT1']);
	});

	it('parses timestamps in the network timezone (WEM +08:00)', () => {
		const { data } = /** @type {any} */ (
			processFacilityPower(buildResponse('+08:00'), { ...config, networkTimezone: '+08:00' })
		);
		// 10:00 AWST = 02:00 UTC.
		expect(data[0].time).toBe(Date.UTC(2026, 1, 8, 2, 0));
	});

	it('returns null for empty or non-matching responses', () => {
		expect(processFacilityPower(null, config)).toBeNull();
		expect(processFacilityPower({ data: [] }, config)).toBeNull();
	});
});
