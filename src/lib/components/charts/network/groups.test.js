import { describe, expect, it } from 'vitest';
import { DEFAULT_GROUP, GROUP_OPTIONS, getGroup, loadGroupsFor } from './groups.js';

describe('network fuel-tech groups', () => {
	it('exposes each compatible grouping once, in the legacy explore menu order', () => {
		expect(GROUP_OPTIONS.map((option) => option.label)).toEqual([
			'Detailed',
			'Simplified',
			'Coal/Gas/Renewables',
			'Flexibility',
			'Renewables/Fossils',
			'VRE/Residual'
		]);
		const values = GROUP_OPTIONS.map((option) => option.value);
		expect(values).toEqual(['detailed', 'simple', 'cgr', 'flexibility', 'rvf', 'vre-residual']);
		expect(new Set(values).size).toBe(values.length);
	});

	it('keeps Detailed as the shared fallback for existing routes', () => {
		expect(DEFAULT_GROUP).toBe('detailed');
		expect(getGroup('unknown').value).toBe('detailed');
	});

	it('inverts only groups made up entirely of load fuel techs', () => {
		const inverted = loadGroupsFor(getGroup('detailed'));
		expect(inverted).toEqual(expect.arrayContaining(['battery_charging', 'pumps']));
		expect(inverted).not.toContain('battery_discharging');
		expect(inverted).not.toContain('coal');
	});

	it('keeps mixed and empty groups positive', () => {
		const config = /** @type {ReturnType<typeof getGroup>} */ (
			/** @type {unknown} */ ({
				fuelTechs: {
					mixed: ['battery_charging', 'coal_black'],
					loads: ['pumps', 'exports'],
					empty: []
				}
			})
		);
		expect(loadGroupsFor(config)).toEqual(['loads']);
	});

	it('maps the legacy Coal/Gas/Renewables groups over the network vocabulary', () => {
		const group = getGroup('cgr');
		expect(group.fuelTechs.coal).toEqual(['coal_black', 'coal_brown']);
		expect(group.fuelTechs.renewables).toEqual(
			expect.arrayContaining(['solar_rooftop', 'wind_offshore', 'hydro', 'bioenergy_biogas'])
		);
		expect(group.fuelTechs.gas).toEqual(expect.arrayContaining(['gas_ccgt_ccs', 'gas_hydrogen']));
		// Battery aggregate folds into discharging, matching the legacy grouping.
		expect(group.fuelTechs.battery_discharging).toContain('battery');
		expect(loadGroupsFor(group)).toEqual(
			expect.arrayContaining(['battery_charging', 'pumps', 'exports'])
		);
	});

	it('maps the legacy Flexibility groups over the network vocabulary', () => {
		const group = getGroup('flexibility');
		expect(group.fuelTechs.variable).toEqual([
			'solar_utility',
			'solar_rooftop',
			'wind',
			'wind_offshore'
		]);
		expect(group.fuelTechs.fast_flexible).toEqual(
			expect.arrayContaining(['hydro', 'gas_ocgt', 'distillate', 'battery_discharging'])
		);
		expect(group.fuelTechs.slow_flexible).toEqual(
			expect.arrayContaining(['coal_black', 'gas_steam', 'bioenergy_biomass'])
		);
		// Order is bottom-of-stack first: loads, then slow → fast → variable.
		expect(group.order.slice(-3)).toEqual(['slow_flexible', 'fast_flexible', 'variable']);
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
