import { describe, it, expect } from 'vitest';
import { processNetworkData } from './process-network-data.js';
import { getGroup } from './groups.js';

/**
 * Build a minimal getNetworkData-shaped response.
 * @param {Array<{ fueltech: string, data: Array<[string, number|null]> }>} series
 */
function makeResponse(series) {
	return {
		data: [
			{
				metric: 'power',
				results: series.map((s) => ({ columns: { fueltech: s.fueltech }, data: s.data }))
			}
		]
	};
}

const detailed = getGroup('detailed');
const simple = getGroup('simple');

/** @param {ReturnType<typeof getGroup>} g */
function configFor(g) {
	return {
		groupMap: g.fuelTechs,
		groupOrder: g.order,
		groupLabels: g.labels,
		loadsToInvert: ['pumps', 'exports', 'battery_charging'],
		getColour: () => '#000000',
		metricFilter: 'power',
		networkTimezone: '+10:00'
	};
}

describe('processNetworkData', () => {
	it('builds chart rows keyed by group with union timestamps (Detailed = 1:1)', () => {
		const res = makeResponse([
			{
				fueltech: 'coal_black',
				data: [
					['2024-01-01T00:00:00', 100],
					['2024-01-01T00:05:00', 110]
				]
			},
			{
				fueltech: 'solar_utility',
				data: [['2024-01-01T00:05:00', 50]]
			}
		]);

		const out = processNetworkData(res, configFor(detailed));
		expect(out).not.toBeNull();
		if (!out) return;

		// Two timestamps in the union
		expect(out.data).toHaveLength(2);
		// First sample: coal present, solar missing → null
		expect(out.data[0].coal_black).toBe(100);
		expect(out.data[0].solar_utility).toBeNull();
		// Second sample: both present
		expect(out.data[1].coal_black).toBe(110);
		expect(out.data[1].solar_utility).toBe(50);

		expect(out.seriesNames).toContain('coal_black');
		expect(out.seriesNames).toContain('solar_utility');
		expect(out.seriesLabels.coal_black).toBe('Coal (Black)');
	});

	it('sums member fuel techs into a group (Simplified)', () => {
		const res = makeResponse([
			{ fueltech: 'coal_black', data: [['2024-01-01T00:00:00', 100]] },
			{ fueltech: 'coal_brown', data: [['2024-01-01T00:00:00', 40]] }
		]);

		const out = processNetworkData(res, configFor(simple));
		expect(out).not.toBeNull();
		if (!out) return;

		expect(out.data).toHaveLength(1);
		// coal_black + coal_brown → single 'coal' group
		expect(out.data[0].coal).toBe(140);
		expect(out.seriesNames).toContain('coal');
		expect(out.seriesNames).not.toContain('coal_black');
	});

	it('inverts load series', () => {
		const res = makeResponse([{ fueltech: 'pumps', data: [['2024-01-01T00:00:00', 30]] }]);
		const out = processNetworkData(res, configFor(detailed));
		expect(out?.data[0].pumps).toBe(-30);
	});

	it('returns null when no series match the grouping', () => {
		const res = makeResponse([{ fueltech: 'unobtanium', data: [['2024-01-01T00:00:00', 5]] }]);
		expect(processNetworkData(res, configFor(detailed))).toBeNull();
	});
});
