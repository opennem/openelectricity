import { describe, it, expect } from 'vitest';
import { fuelTechColourMap } from '$lib/theme/openelectricity';
import { getFuelTechColour, SERIES_FALLBACK_COLOUR } from './colours.js';

describe('getFuelTechColour', () => {
	it('returns the mapped theme colour for a known fuel tech', () => {
		expect(getFuelTechColour('solar_utility')).toBe(fuelTechColourMap.solar_utility);
		expect(getFuelTechColour('coal_black')).toBe(fuelTechColourMap.coal_black);
	});

	it('falls back to the neutral series grey for unknown codes', () => {
		expect(getFuelTechColour('not_a_fuel_tech')).toBe(SERIES_FALLBACK_COLOUR);
		expect(getFuelTechColour('')).toBe(SERIES_FALLBACK_COLOUR);
	});
});
