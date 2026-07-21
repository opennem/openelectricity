import { describe, it, expect } from 'vitest';
import {
	makeLoadAwareColourGetter,
	generateUnitShades,
	buildUnitColourMap,
	SHADE_SPREADS,
	getNetworkTimezone
} from './helpers.js';

describe('makeLoadAwareColourGetter', () => {
	const unitColours = { U1: '#336699', U2: '#aabbcc' };
	const getFuelTechColor = () => '#000000';

	it('returns the base colour for generators', () => {
		const colour = makeLoadAwareColourGetter(unitColours, [], getFuelTechColor);
		expect(colour('U1', 'coal_black')).toBe('#336699');
	});

	it('brightens load units, matched by bare unit code', () => {
		const colour = makeLoadAwareColourGetter(unitColours, ['U1'], getFuelTechColor);
		const loadColour = colour('U1', 'battery_charging');
		expect(loadColour).not.toBe('#336699'); // brightened
		expect(colour('U2', 'coal_black')).toBe('#aabbcc'); // non-load unchanged
	});

	it('falls back to the fuel-tech colour when the unit has none', () => {
		const colour = makeLoadAwareColourGetter({}, [], () => '#123456');
		expect(colour('UX', 'gas_ccgt')).toBe('#123456');
	});
});

describe('generateUnitShades', () => {
	it('should return single color for single unit', () => {
		const result = generateUnitShades('#744A26', 1);
		expect(result).toHaveLength(1);
		expect(result[0]).toBe('#744A26');
	});

	it('should generate multiple shades for multiple units', () => {
		const result = generateUnitShades('#744A26', 3);
		expect(result).toHaveLength(3);
		// Each shade should be a valid hex color
		result.forEach((color) => {
			expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
		});
		// Shades should be different
		expect(new Set(result).size).toBe(3);
	});

	it('should generate correct number of shades', () => {
		expect(generateUnitShades('#FF0000', 2)).toHaveLength(2);
		expect(generateUnitShades('#FF0000', 4)).toHaveLength(4);
		expect(generateUnitShades('#FF0000', 5)).toHaveLength(5);
	});

	it('should produce darker and lighter variants', () => {
		const baseColor = '#808080'; // mid-gray for easy testing
		const result = generateUnitShades(baseColor, 3);
		// First should be darker, last should be lighter
		expect(result[0]).not.toBe(result[2]);
	});

	it('anchors at the base colour when darken is 0 (coal_black override)', () => {
		const result = generateUnitShades('#121212', 3, { darken: 0, brighten: 2 });
		expect(result[0].toLowerCase()).toBe('#121212');
		// The ramp still brightens toward the last unit.
		expect(new Set(result).size).toBe(3);
	});

	it('should handle various base colors', () => {
		const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000'];
		colors.forEach((color) => {
			const result = generateUnitShades(color, 3);
			expect(result).toHaveLength(3);
			result.forEach((shade) => {
				expect(shade).toMatch(/^#[0-9A-Fa-f]{6}$/);
			});
		});
	});
});

describe('buildUnitColourMap', () => {
	/**
	 * @param {string} ft
	 * @returns {string}
	 */
	const mockGetBaseColor = (ft) => {
		/** @type {Record<string, string>} */
		const colors = {
			coal_brown: '#744A26',
			solar_utility: '#FED500',
			battery_charging: '#577CFF'
		};
		return colors[ft] || '#888888';
	};

	it('applies the coal_black spread override (first unit stays at the base colour)', () => {
		expect(SHADE_SPREADS.coal_black).toEqual({ darken: 0, brighten: 2 });
		const colours = buildUnitColourMap(
			[
				{ code: 'BW01', fueltech_id: 'coal_black' },
				{ code: 'BW02', fueltech_id: 'coal_black' }
			],
			() => '#121212'
		);
		expect(colours.BW01.toLowerCase()).toBe('#121212');
		expect(colours.BW02).not.toBe(colours.BW01);
	});

	it('should assign unique colors to units with different fuel techs', () => {
		const units = [
			{ code: 'UNIT1', fueltech_id: 'coal_brown' },
			{ code: 'UNIT2', fueltech_id: 'solar_utility' }
		];

		const result = buildUnitColourMap(units, mockGetBaseColor);

		expect(result.UNIT1).toBe('#744A26');
		expect(result.UNIT2).toBe('#FED500');
	});

	it('should generate shades for units with same fuel tech', () => {
		const units = [
			{ code: 'UNIT1', fueltech_id: 'coal_brown' },
			{ code: 'UNIT2', fueltech_id: 'coal_brown' },
			{ code: 'UNIT3', fueltech_id: 'coal_brown' }
		];

		const result = buildUnitColourMap(units, mockGetBaseColor);

		// All units should have colors assigned
		expect(result.UNIT1).toBeDefined();
		expect(result.UNIT2).toBeDefined();
		expect(result.UNIT3).toBeDefined();

		// Colors should be different (shades)
		const uniqueColors = new Set([result.UNIT1, result.UNIT2, result.UNIT3]);
		expect(uniqueColors.size).toBe(3);
	});

	it('should handle mixed fuel techs correctly', () => {
		const units = [
			{ code: 'COAL1', fueltech_id: 'coal_brown' },
			{ code: 'COAL2', fueltech_id: 'coal_brown' },
			{ code: 'SOLAR1', fueltech_id: 'solar_utility' },
			{ code: 'BATTERY1', fueltech_id: 'battery_charging' }
		];

		const result = buildUnitColourMap(units, mockGetBaseColor);

		// All units should have colors
		expect(Object.keys(result)).toHaveLength(4);

		// Coal units should have shades of coal color
		expect(result.COAL1).not.toBe(result.COAL2);

		// Solar and battery should have their base colors
		expect(result.SOLAR1).toBe('#FED500');
		expect(result.BATTERY1).toBe('#577CFF');
	});

	it('should handle empty units array', () => {
		const result = buildUnitColourMap([], mockGetBaseColor);
		expect(result).toEqual({});
	});

	it('should handle unknown fuel techs with default color', () => {
		const units = [{ code: 'UNIT1', fueltech_id: 'unknown_tech' }];

		const result = buildUnitColourMap(units, mockGetBaseColor);

		expect(result.UNIT1).toBe('#888888');
	});

	it('should handle units with missing fueltech_id', () => {
		const units = /** @type {any[]} */ ([{ code: 'UNIT1' }]);

		const result = buildUnitColourMap(units, mockGetBaseColor);

		expect(result.UNIT1).toBeDefined();
	});
});

describe('getNetworkTimezone', () => {
	it('should return +08:00 for WEM network', () => {
		expect(getNetworkTimezone('WEM')).toBe('+08:00');
	});

	it('should return +10:00 for NEM network', () => {
		expect(getNetworkTimezone('NEM')).toBe('+10:00');
	});

	it('should return +10:00 for other networks', () => {
		expect(getNetworkTimezone('AEMO')).toBe('+10:00');
		expect(getNetworkTimezone('OTHER')).toBe('+10:00');
	});

	it('should return +10:00 for null or undefined', () => {
		expect(getNetworkTimezone(null)).toBe('+10:00');
		expect(getNetworkTimezone(undefined)).toBe('+10:00');
	});

	it('should return +10:00 for empty string', () => {
		expect(getNetworkTimezone('')).toBe('+10:00');
	});
});
