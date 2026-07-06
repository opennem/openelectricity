import { describe, it, expect } from 'vitest';
import { primaryFuelTechColour, getFueltechColor } from './fueltech-display.js';

describe('primaryFuelTechColour', () => {
	it('returns white when there are no units', () => {
		expect(primaryFuelTechColour()).toBe('#ffffff');
		expect(primaryFuelTechColour([])).toBe('#ffffff');
	});

	it('returns white when no unit has a fuel-tech', () => {
		expect(primaryFuelTechColour([{}, { fueltech_id: undefined }])).toBe('#ffffff');
	});

	it('uses the colour of the most common fuel-tech', () => {
		const units = [
			{ fueltech_id: 'coal_black' },
			{ fueltech_id: 'coal_black' },
			{ fueltech_id: 'wind' }
		];
		expect(primaryFuelTechColour(units)).toBe(getFueltechColor('coal_black'));
	});

	it('handles a single-fuel-tech facility', () => {
		expect(primaryFuelTechColour([{ fueltech_id: 'wind' }])).toBe(getFueltechColor('wind'));
	});
});
