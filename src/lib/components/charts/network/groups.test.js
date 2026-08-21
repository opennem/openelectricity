import { describe, expect, it } from 'vitest';
import { DEFAULT_GROUP, GROUP_OPTIONS, getGroup } from './groups.js';

describe('network fuel-tech groups', () => {
	it('exposes each compatible grouping once in the intended order', () => {
		const values = GROUP_OPTIONS.map((option) => option.value);
		expect(values).toEqual([
			'simple',
			'detailed',
			'rvf',
			'vre-residual',
			'sources_loads',
			'sources_without_battery'
		]);
		expect(new Set(values).size).toBe(values.length);
	});

	it('keeps Detailed as the shared fallback for existing routes', () => {
		expect(DEFAULT_GROUP).toBe('detailed');
		expect(getGroup('unknown').value).toBe('detailed');
	});

	it('maps detailed network codes into VRE and residual groups', () => {
		const group = getGroup('vre-residual');
		expect(group.fuelTechs.vre).toEqual(
			expect.arrayContaining(['wind_offshore', 'solar_utility', 'solar_rooftop'])
		);
		expect(group.fuelTechs.residual).toEqual(
			expect.arrayContaining(['coal_black', 'gas_ccgt', 'battery_discharging', 'hydro'])
		);
		expect(group.fuelTechs.imports).toEqual(['imports']);
	});
});
