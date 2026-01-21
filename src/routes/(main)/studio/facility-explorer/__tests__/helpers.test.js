import { describe, it, expect } from 'vitest';
import {
	generateUnitShades,
	buildUnitColourMap,
	getNetworkTimezone,
	isWemNetwork,
	transformFacilityPowerData
} from '../helpers';

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
		// @ts-expect-error - Testing edge case with missing fueltech_id
		const units = [{ code: 'UNIT1' }];

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

describe('isWemNetwork', () => {
	it('should return true for WEM network', () => {
		expect(isWemNetwork('WEM')).toBe(true);
	});

	it('should return false for NEM network', () => {
		expect(isWemNetwork('NEM')).toBe(false);
	});

	it('should return false for other networks', () => {
		expect(isWemNetwork('AEMO')).toBe(false);
		expect(isWemNetwork('OTHER')).toBe(false);
	});

	it('should return false for null or undefined', () => {
		expect(isWemNetwork(null)).toBe(false);
		expect(isWemNetwork(undefined)).toBe(false);
	});

	it('should return false for empty string', () => {
		expect(isWemNetwork('')).toBe(false);
	});
});

describe('transformFacilityPowerData', () => {
	const mockUnitFuelTechMap = {
		LOYYB1: 'coal_brown',
		LOYYB2: 'coal_brown'
	};

	it('should return empty array for null/undefined input', () => {
		expect(transformFacilityPowerData(null, mockUnitFuelTechMap)).toEqual([]);
		expect(transformFacilityPowerData(undefined, mockUnitFuelTechMap)).toEqual([]);
		expect(transformFacilityPowerData({}, mockUnitFuelTechMap)).toEqual([]);
	});

	it('should transform API response to expected format', () => {
		const apiResponse = {
			data: [
				{
					metric: 'power',
					unit: 'MW',
					interval: '5m',
					results: [
						{
							name: 'power_LOYYB1',
							columns: { unit_code: 'LOYYB1' },
							data: [
								['2026-01-14T00:00:00+10:00', 577.5],
								['2026-01-14T00:05:00+10:00', 578.25]
							]
						}
					]
				}
			]
		};

		const result = transformFacilityPowerData(apiResponse, mockUnitFuelTechMap);

		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			id: 'power_LOYYB1',
			type: 'power',
			fueltech_id: 'coal_brown',
			unit: { code: 'LOYYB1', fueltech_id: 'coal_brown' },
			units: 'MW',
			history: {
				start: '2026-01-14T00:00:00+10:00',
				last: '2026-01-14T00:05:00+10:00',
				interval: '5m',
				data: [577.5, 578.25]
			}
		});
	});

	it('should handle multiple units', () => {
		const apiResponse = {
			data: [
				{
					metric: 'power',
					unit: 'MW',
					interval: '5m',
					results: [
						{
							name: 'power_LOYYB1',
							columns: { unit_code: 'LOYYB1' },
							data: [['2026-01-14T00:00:00+10:00', 500]]
						},
						{
							name: 'power_LOYYB2',
							columns: { unit_code: 'LOYYB2' },
							data: [['2026-01-14T00:00:00+10:00', 550]]
						}
					]
				}
			]
		};

		const result = transformFacilityPowerData(apiResponse, mockUnitFuelTechMap);

		expect(result).toHaveLength(2);
		expect(result[0].unit.code).toBe('LOYYB1');
		expect(result[1].unit.code).toBe('LOYYB2');
	});

	it('should use "unknown" for units not in fuel tech map', () => {
		const apiResponse = {
			data: [
				{
					metric: 'power',
					results: [
						{
							name: 'power_UNKNOWN1',
							columns: { unit_code: 'UNKNOWN1' },
							data: [['2026-01-14T00:00:00+10:00', 100]]
						}
					]
				}
			]
		};

		const result = transformFacilityPowerData(apiResponse, mockUnitFuelTechMap);

		expect(result[0].fueltech_id).toBe('unknown');
	});

	it('should skip non-power metrics', () => {
		const apiResponse = {
			data: [
				{
					metric: 'energy',
					results: [{ name: 'energy_LOYYB1', columns: { unit_code: 'LOYYB1' }, data: [[]] }]
				},
				{
					metric: 'power',
					results: [
						{
							name: 'power_LOYYB1',
							columns: { unit_code: 'LOYYB1' },
							data: [['2026-01-14T00:00:00+10:00', 500]]
						}
					]
				}
			]
		};

		const result = transformFacilityPowerData(apiResponse, mockUnitFuelTechMap);

		expect(result).toHaveLength(1);
		expect(result[0].type).toBe('power');
	});

	it('should skip series with no data', () => {
		const apiResponse = {
			data: [
				{
					metric: 'power',
					results: [
						{
							name: 'power_LOYYB1',
							columns: { unit_code: 'LOYYB1' },
							data: []
						}
					]
				}
			]
		};

		const result = transformFacilityPowerData(apiResponse, mockUnitFuelTechMap);

		expect(result).toHaveLength(0);
	});
});
