import { describe, it, expect } from 'vitest';
import {
	TRANSMISSION_BANDS,
	allBandsVisible,
	bandColour,
	bandColours,
	transmissionBandFilter
} from './transmission-bands.js';

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

describe('bandColour', () => {
	// The key reads this per band and the layers read it via bandColours, so a
	// disagreement here is a key that lies about what the map is drawing.
	it('uses the deep tones only on the light basemap', () => {
		for (const band of TRANSMISSION_BANDS) {
			expect(bandColour(band, 'light')).toBe(band.colour);
			expect(bandColour(band, 'dark')).toBe(band.brightColour);
			expect(bandColour(band, 'satellite')).toBe(band.brightColour);
		}
	});
});

describe('allBandsVisible', () => {
	it('covers every band, each on, as a fresh object per call', () => {
		expect(allBandsVisible()).toEqual({ high: true, medium: true, low: true, lowest: true });
		expect(allBandsVisible()).not.toBe(allBandsVisible());
	});
});

describe('transmissionBandFilter', () => {
	const allOn = allBandsVisible();

	// Both maps hand this straight to MapLibre, so the tests pin the expression
	// shape, not just its intent.
	it('gates every visible band behind Operational status', () => {
		const filter = transmissionBandFilter(allOn);
		expect(filter[0]).toBe('all');
		expect(filter[1]).toEqual(['==', ['get', 'operationalstatus'], 'Operational']);
		expect(filter[2][0]).toBe('any');
		expect(filter[2]).toHaveLength(1 + TRANSMISSION_BANDS.length);
	});

	// Adjacent bands must tile the voltage axis: each floor is the band below's
	// ceiling, the top band unbounded above, the bottom unbounded below.
	it('bounds each band by its own floor and the band above’s', () => {
		const [, , [, high, medium, low, lowest]] = transmissionBandFilter(allOn);
		expect(high).toEqual(['>=', ['get', 'capacitykv'], 400]);
		expect(medium).toEqual([
			'all',
			['>=', ['get', 'capacitykv'], 220],
			['<', ['get', 'capacitykv'], 400]
		]);
		expect(low).toEqual([
			'all',
			['>=', ['get', 'capacitykv'], 110],
			['<', ['get', 'capacitykv'], 220]
		]);
		expect(lowest).toEqual(['<', ['get', 'capacitykv'], 110]);
	});

	it('keeps only the selected bands', () => {
		const filter = transmissionBandFilter({
			high: true,
			medium: false,
			low: false,
			lowest: false
		});
		expect(filter[2]).toEqual(['any', ['>=', ['get', 'capacitykv'], 400]]);
	});

	it('matches nothing when every band is off', () => {
		expect(
			transmissionBandFilter({ high: false, medium: false, low: false, lowest: false })
		).toEqual(['==', ['get', 'operationalstatus'], '__never_match__']);
	});
});

describe('bandColours', () => {
	// Per-theme resolution is bandColour's contract, tested above; what this form
	// adds is the band order the layers' `case` expressions index into.
	it('returns one colour per band, in band order', () => {
		expect(bandColours('light')).toEqual(TRANSMISSION_BANDS.map((band) => band.colour));
	});

	it('gives every band a distinct colour in both sets', () => {
		expect(new Set(bandColours('light')).size).toBe(TRANSMISSION_BANDS.length);
		expect(new Set(bandColours('dark')).size).toBe(TRANSMISSION_BANDS.length);
	});
});
