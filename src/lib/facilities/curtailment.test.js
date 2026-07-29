import { describe, it, expect } from 'vitest';
import { facilityCurtailmentScope, curtailmentMetric } from './curtailment.js';

/**
 * @param {Partial<{ network_id: string, network_region: string, units: any[] }>} overrides
 */
const facility = (overrides = {}) => ({
	network_id: 'NEM',
	network_region: 'VIC1',
	units: [{ fueltech_id: 'wind' }],
	...overrides
});

describe('facilityCurtailmentScope', () => {
	it('resolves a wind facility to the wind split', () => {
		expect(facilityCurtailmentScope(facility())).toEqual({
			kind: 'wind',
			region: 'vic1',
			regionLabel: 'VIC1',
			regionName: 'Victoria',
			label: 'Wind curtailment',
			note: expect.stringContaining('Victoria')
		});
	});

	it('resolves the friendly region name, falling back to the market code', () => {
		expect(facilityCurtailmentScope(facility({ network_region: 'SA1' }))?.regionName).toBe(
			'South Australia'
		);
		// An unrecognised region still renders something usable.
		const unknown = facilityCurtailmentScope(facility({ network_region: 'XYZ1' }));
		expect(unknown?.regionName).toBe('XYZ1');
	});

	it('names the region in the non-attribution note', () => {
		// The note is the panel heading's tooltip — it has to disclaim attribution
		// to the facility, since the series is a whole-of-region aggregate.
		const note = facilityCurtailmentScope(facility({ network_region: 'SA1' }))?.note ?? '';
		expect(note).toContain('South Australia as a whole');
		expect(note).toContain('not attributed to this facility');
	});

	it('resolves a utility solar facility to the solar split', () => {
		const scope = facilityCurtailmentScope(
			facility({ network_region: 'QLD1', units: [{ fueltech_id: 'solar_utility' }] })
		);
		expect(scope).toMatchObject({ kind: 'solar', region: 'qld1', label: 'Solar curtailment' });
	});

	it('resolves a hybrid wind + solar facility to both', () => {
		const scope = facilityCurtailmentScope(
			facility({ units: [{ fueltech_id: 'wind' }, { fueltech_id: 'solar_utility' }] })
		);
		expect(scope).toMatchObject({ kind: 'both', label: 'Wind & solar curtailment' });
	});

	it('ignores non-curtailed fuel techs alongside a curtailed one', () => {
		// Wind + battery hybrids are common; the battery units have no counterpart.
		const scope = facilityCurtailmentScope(
			facility({
				units: [
					{ fueltech_id: 'wind' },
					{ fueltech_id: 'battery_charging' },
					{ fueltech_id: 'battery_discharging' }
				]
			})
		);
		expect(scope).toMatchObject({ kind: 'wind' });
	});

	it('returns null for the WEM — curtailment is a NEM-only metric', () => {
		expect(
			facilityCurtailmentScope(facility({ network_id: 'WEM', network_region: 'WEM' }))
		).toBeNull();
	});

	it('returns null when no unit has a curtailed fuel tech', () => {
		expect(
			facilityCurtailmentScope(facility({ units: [{ fueltech_id: 'coal_black' }] }))
		).toBeNull();
	});

	it('returns null for rooftop solar — the split covers utility solar only', () => {
		expect(
			facilityCurtailmentScope(facility({ units: [{ fueltech_id: 'solar_rooftop' }] }))
		).toBeNull();
	});

	it('returns null for a missing facility, units or region', () => {
		expect(facilityCurtailmentScope(null)).toBeNull();
		expect(facilityCurtailmentScope(facility({ units: undefined }))).toBeNull();
		expect(facilityCurtailmentScope(facility({ network_region: undefined }))).toBeNull();
	});
});

describe('curtailmentMetric', () => {
	it('ladders each kind between power and energy', () => {
		expect(curtailmentMetric('wind', 'power')).toBe('curtailment_wind');
		expect(curtailmentMetric('wind', 'energy')).toBe('curtailment_wind_energy');
		expect(curtailmentMetric('solar', 'power')).toBe('curtailment_solar');
		expect(curtailmentMetric('solar', 'energy')).toBe('curtailment_solar_energy');
	});

	it('maps a hybrid facility to the combined key that fans out to both splits', () => {
		expect(curtailmentMetric('both', 'power')).toBe('curtailment');
		expect(curtailmentMetric('both', 'energy')).toBe('curtailment_energy');
	});
});
