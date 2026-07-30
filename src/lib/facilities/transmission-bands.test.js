import { describe, it, expect } from 'vitest';
import { TRANSMISSION_BANDS, bandColours } from './transmission-bands.js';

describe('TRANSMISSION_BANDS', () => {
	// Map.svelte's `line-color` expression indexes straight into this order —
	// lineColours[0] pairs with the >= 400 test, [1] with >= 220, and so on. A
	// reorder here would silently repaint the layer with the wrong colours.
	it('is ordered by descending voltage floor', () => {
		const mins = TRANSMISSION_BANDS.map((band) => band.min);
		expect(mins).toEqual([...mins].sort((a, b) => b - a));
	});

	it('opens each band at the threshold its paint expression tests', () => {
		expect(TRANSMISSION_BANDS.map((band) => band.min)).toEqual([400, 220, 110, 0]);
	});

	// The key draws the swatches at these weights; the ladder is what tells the
	// bands apart at legend scale, so it has to descend with the voltage.
	it('gives higher voltages heavier swatches', () => {
		const widths = TRANSMISSION_BANDS.map((band) => band.width);
		expect(widths).toEqual([...widths].sort((a, b) => b - a));
		expect(new Set(widths).size).toBe(widths.length);
	});

	it('labels the bands without units — the key states kV once, in its heading', () => {
		for (const band of TRANSMISSION_BANDS) {
			expect(band.label).not.toMatch(/kv/i);
		}
	});
});

describe('bandColours', () => {
	it('returns the basemap-appropriate colour per band, in band order', () => {
		expect(bandColours(false)).toEqual(TRANSMISSION_BANDS.map((band) => band.colour));
		expect(bandColours(true)).toEqual(TRANSMISSION_BANDS.map((band) => band.satelliteColour));
	});

	it('gives every band a distinct colour in both sets', () => {
		expect(new Set(bandColours(false)).size).toBe(TRANSMISSION_BANDS.length);
		expect(new Set(bandColours(true)).size).toBe(TRANSMISSION_BANDS.length);
	});
});
