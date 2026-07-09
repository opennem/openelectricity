import { describe, it, expect } from 'vitest';
import { makeLoadAwareColourGetter } from './helpers.js';

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
