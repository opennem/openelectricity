import { describe, expect, it } from 'vitest';
import { getFetchPath } from './fetch-path.js';

/** @param {Partial<MilestoneRecord>} overrides */
function queryFor(overrides) {
	return new URL(
		getFetchPath(
			{
				record_id: 'au.nem.sa1.renewables.proportion.interval.high',
				network_id: 'NEM',
				network_region: 'SA1',
				metric: 'renewable_proportion',
				period: 'interval',
				aggregate: 'high',
				...overrides
			},
			'2026-09-04T14:45',
			'2026-09-11T14:45'
		),
		'http://openelectricity.localhost:7602'
	).searchParams;
}

describe('record mini-chart requests', () => {
	it.each([undefined, 'renewables'])('uses market percentages with fueltech_id %s', (fuelTech) => {
		const query = queryFor({ fueltech_id: /** @type {FuelTechCode} */ (fuelTech) });
		expect(query.get('dataType')).toBe('market');
		expect(query.get('metric')).toBe('renewable_proportion');
		expect(query.get('networkRegion')).toBe('SA1');
		expect(query.get('primaryGrouping')).toBe('network_region');
		expect(query.get('interval')).toBe('5m');
		expect(query.get('dateStart')).toBe('2026-09-04T14:45');
		expect(query.get('dateEnd')).toBe('2026-09-11T14:45');
		expect(query.has('secondaryGrouping')).toBe(false);
		expect(query.has('fueltechGroup')).toBe(false);
	});

	it('supports a network-wide proportion record', () => {
		const query = queryFor({ network_id: 'WEM', network_region: null });
		expect(query.get('networkId')).toBe('WEM');
		expect(query.get('primaryGrouping')).toBe('network');
		expect(query.has('networkRegion')).toBe(false);
	});

	it.each(['renewables', 'fossils'])('keeps %s generation grouped by renewable', (fuelTech) => {
		const query = queryFor({
			metric: 'power',
			fueltech_id: /** @type {FuelTechCode} */ (fuelTech)
		});
		expect(query.get('dataType')).toBe('network');
		expect(query.get('metric')).toBe('power');
		expect(query.get('secondaryGrouping')).toBe('renewable');
		expect(query.has('fueltechGroup')).toBe(false);
	});

	it('keeps individual technology requests filtered to their fuel-tech group', () => {
		const query = queryFor({ metric: 'energy', fueltech_id: 'wind', period: 'day' });
		expect(query.get('dataType')).toBe('network');
		expect(query.get('metric')).toBe('energy');
		expect(query.get('interval')).toBe('1d');
		expect(query.get('secondaryGrouping')).toBe('fueltech_group');
		expect(query.get('fueltechGroup')).toBe('wind');
	});

	it.each([
		['interval', 'demand'],
		['day', 'demand_energy']
	])('uses market demand for %s records', (period, metric) => {
		const query = queryFor({ metric: 'power', fueltech_id: 'demand', period });
		expect(query.get('dataType')).toBe('market');
		expect(query.get('metric')).toBe(metric);
		expect(query.has('secondaryGrouping')).toBe(false);
		expect(query.has('fueltechGroup')).toBe(false);
	});
});
