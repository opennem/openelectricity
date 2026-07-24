import { describe, it, expect } from 'vitest';
import {
	HYBRID_MIN_ZOOM,
	FACILITIES_MIN_ZOOM,
	BAND_HYSTERESIS,
	bandForZoom,
	nextBand,
	bandProgress,
	gridOpacity,
	facilitiesOpacity,
	dominantRegion
} from './zoom-bands.js';

describe('bandForZoom (memoryless)', () => {
	it('maps zoom to bands at the raw boundaries', () => {
		expect(bandForZoom(3)).toBe('national');
		expect(bandForZoom(HYBRID_MIN_ZOOM - 0.01)).toBe('national');
		expect(bandForZoom(HYBRID_MIN_ZOOM)).toBe('hybrid');
		expect(bandForZoom(FACILITIES_MIN_ZOOM - 0.01)).toBe('hybrid');
		expect(bandForZoom(FACILITIES_MIN_ZOOM)).toBe('facilities');
		expect(bandForZoom(12)).toBe('facilities');
	});
});

describe('nextBand (hysteresis)', () => {
	it('holds national until the overshoot going in', () => {
		expect(nextBand('national', HYBRID_MIN_ZOOM)).toBe('national');
		expect(nextBand('national', HYBRID_MIN_ZOOM + BAND_HYSTERESIS - 0.01)).toBe('national');
		expect(nextBand('national', HYBRID_MIN_ZOOM + BAND_HYSTERESIS)).toBe('hybrid');
	});

	it('holds hybrid until the overshoot going back out', () => {
		expect(nextBand('hybrid', HYBRID_MIN_ZOOM)).toBe('hybrid');
		expect(nextBand('hybrid', HYBRID_MIN_ZOOM - BAND_HYSTERESIS + 0.01)).toBe('hybrid');
		expect(nextBand('hybrid', HYBRID_MIN_ZOOM - BAND_HYSTERESIS)).toBe('national');
	});

	it('holds hybrid until the overshoot into facilities', () => {
		expect(nextBand('hybrid', FACILITIES_MIN_ZOOM)).toBe('hybrid');
		expect(nextBand('hybrid', FACILITIES_MIN_ZOOM + BAND_HYSTERESIS - 0.01)).toBe('hybrid');
		expect(nextBand('hybrid', FACILITIES_MIN_ZOOM + BAND_HYSTERESIS)).toBe('facilities');
	});

	it('holds facilities until the overshoot back into hybrid', () => {
		expect(nextBand('facilities', FACILITIES_MIN_ZOOM)).toBe('facilities');
		expect(nextBand('facilities', FACILITIES_MIN_ZOOM - BAND_HYSTERESIS + 0.01)).toBe('facilities');
		expect(nextBand('facilities', FACILITIES_MIN_ZOOM - BAND_HYSTERESIS)).toBe('hybrid');
	});

	it('is stable inside the dead zone in both directions', () => {
		// Between 5.05 and 5.35 the band depends on where you came from.
		expect(nextBand('national', 5.3)).toBe('national');
		expect(nextBand('hybrid', 5.3)).toBe('hybrid');
	});

	it('walks multiple bands in a single large jump', () => {
		expect(nextBand('national', 9)).toBe('facilities');
		expect(nextBand('facilities', 3)).toBe('national');
	});

	it('falls back to the memoryless mapping for an unknown current band', () => {
		expect(nextBand(undefined, 4)).toBe('national');
		expect(nextBand(null, 6)).toBe('hybrid');
		expect(nextBand('bogus', 8)).toBe('facilities');
	});
});

describe('bandProgress', () => {
	it('ramps 0 → 1 across the hybrid window and clamps outside it', () => {
		expect(bandProgress(3)).toBe(0);
		expect(bandProgress(HYBRID_MIN_ZOOM)).toBe(0);
		const mid = (HYBRID_MIN_ZOOM + FACILITIES_MIN_ZOOM) / 2;
		expect(bandProgress(mid)).toBeCloseTo(0.5, 5);
		expect(bandProgress(FACILITIES_MIN_ZOOM)).toBe(1);
		expect(bandProgress(10)).toBe(1);
	});
});

describe('opacity ramps', () => {
	it('grid layers fade 1 → 0 across the hybrid window', () => {
		expect(gridOpacity(4)).toBe(1);
		expect(gridOpacity(HYBRID_MIN_ZOOM)).toBe(1);
		const mid = (HYBRID_MIN_ZOOM + FACILITIES_MIN_ZOOM) / 2;
		expect(gridOpacity(mid)).toBeCloseTo(0.5, 5);
		expect(gridOpacity(FACILITIES_MIN_ZOOM)).toBe(0);
		expect(gridOpacity(9)).toBe(0);
	});

	it('facilities fade 0.15 → 1 across the hybrid window', () => {
		expect(facilitiesOpacity(4)).toBeCloseTo(0.15, 5);
		expect(facilitiesOpacity(HYBRID_MIN_ZOOM)).toBeCloseTo(0.15, 5);
		const mid = (HYBRID_MIN_ZOOM + FACILITIES_MIN_ZOOM) / 2;
		expect(facilitiesOpacity(mid)).toBeCloseTo(0.575, 5);
		expect(facilitiesOpacity(FACILITIES_MIN_ZOOM)).toBe(1);
		expect(facilitiesOpacity(9)).toBe(1);
	});
});

describe('dominantRegion', () => {
	it('resolves capital-ish centres to their region anchors', () => {
		expect(dominantRegion([151.2, -33.9])).toBe('NSW1'); // Sydney
		expect(dominantRegion([153.0, -27.5])).toBe('QLD1'); // Brisbane
		expect(dominantRegion([138.6, -34.9])).toBe('SA1'); // Adelaide
		expect(dominantRegion([144.9, -37.8])).toBe('VIC1'); // Melbourne
		expect(dominantRegion([115.9, -31.9])).toBe('WEM'); // Perth
	});

	it('short-circuits to TAS1 south of Bass Strait', () => {
		expect(dominantRegion([147.3, -42.9])).toBe('TAS1'); // Hobart
		// King Island sits closer to the VIC anchor than the TAS one — the
		// latitude cut-off must win.
		expect(dominantRegion([144.0, -40.6])).toBe('TAS1');
	});

	it('does not claim TAS north of the cut-off', () => {
		expect(dominantRegion([144.5, -38.5])).toBe('VIC1');
	});

	it('keeps a camera inside a state in that state despite an off-centre anchor', () => {
		// Adelaide is closer to the VIC anchor than SA's mid-state anchor —
		// the REGION_BOUNDS containment filter must keep it in SA1.
		expect(dominantRegion([138.6, -35.0])).toBe('SA1');
	});

	it('falls back to global nearest-anchor outside every bounds box', () => {
		// WA interior — outside both the WEM and SA1 boxes; WEM's anchor is nearest.
		expect(dominantRegion([125.0, -30.0])).toBe('WEM');
	});
});
