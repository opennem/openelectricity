import { describe, it, expect } from 'vitest';
import { createFacilityDataManager } from './facility-data-manager.js';
import { unitsKeyFor } from './unit-analysis.js';

const UNIT_MAP = { UNIT1: 'coal_black', PUMP1: 'pumps' };

/** @param {any} [overrides] */
function makeManager(overrides = {}) {
	return createFacilityDataManager({
		facilityCode: 'TESTFAC',
		networkId: 'NEM',
		unitFuelTechMap: UNIT_MAP,
		orderedCodes: ['UNIT1', 'PUMP1'],
		loadCodes: ['PUMP1'],
		getLabel: (/** @type {string} */ code) => `label:${code}`,
		getColour: (/** @type {string} */ code) => `colour:${code}`,
		...overrides
	});
}

/** One-metric response with a single [timestamp, value] pair per unit. */
const response = (metric = 'power') => ({
	data: [
		{
			metric,
			results: [
				// Reversed vs orderedCodes to prove the factory applies unit ordering
				{
					name: `${metric}_PUMP1`,
					columns: { unit_code: 'PUMP1' },
					data: [['2026-01-21T01:00:00', 5]]
				},
				{
					name: `${metric}_UNIT1`,
					columns: { unit_code: 'UNIT1' },
					data: [['2026-01-21T01:00:00', 100]]
				}
			]
		}
	]
});

describe('createFacilityDataManager', () => {
	it('keys the manager on the facility code and the unit-set identity', () => {
		const manager = makeManager();
		expect(manager.cacheKey).toBe('TESTFAC');
		expect(manager.seriesKey).toBe(unitsKeyFor(UNIT_MAP));
	});

	it('resolves the network timezone from the network id', () => {
		expect(makeManager().networkTimezone).toBe('+10:00');
		expect(makeManager({ networkId: 'WEM' }).networkTimezone).toBe('+08:00');
	});

	it('builds the default facility URL with the network_id param', () => {
		const manager = makeManager({ networkId: 'WEM' });
		const url = new URL(
			manager.buildFetchUrl(new URLSearchParams({ interval: '5m', metric: 'power' })),
			'http://localhost'
		);
		expect(url.pathname).toBe('/api/facilities/TESTFAC/power');
		expect(url.searchParams.get('network_id')).toBe('WEM');
		expect(url.searchParams.get('interval')).toBe('5m');
	});

	it('injects network_id before delegating to a custom URL builder', () => {
		/** @type {URLSearchParams | null} */
		let seen = null;
		const manager = makeManager({
			buildFetchUrl: (/** @type {URLSearchParams} */ params) => {
				seen = params;
				return `/api/custom?${params.toString()}`;
			}
		});
		const url = manager.buildFetchUrl(new URLSearchParams({ interval: '5m' }));
		expect(url.startsWith('/api/custom?')).toBe(true);
		expect(/** @type {URLSearchParams | null} */ (seen)?.get('network_id')).toBe('NEM');
	});

	it('orders and inverts series per the manager metric prefix', () => {
		const manager = makeManager({ metric: 'energy' });
		const result = manager.processResponse(response('energy'));

		expect(result?.seriesNames).toEqual(['energy_UNIT1', 'energy_PUMP1']);
		// PUMP1 is a load — its values invert
		expect(result?.data[0].energy_PUMP1).toBe(-5);
		expect(result?.data[0].energy_UNIT1).toBe(100);
		expect(result?.seriesLabels.energy_UNIT1).toBe('label:UNIT1');
		expect(result?.seriesColours.energy_PUMP1).toBe('colour:PUMP1');
	});
});
