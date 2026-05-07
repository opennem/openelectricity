import { describe, it, expect } from 'vitest';
import {
	voltageBand,
	colourFor,
	alphaFor,
	widthFor,
	proximityScore,
	buildFacilityGrid,
	proximityScoreFromGrid,
	FAR_RGB,
	NEAR_RGB,
	segmentTransmission
} from './segment-transmission.js';

const ALL_VISIBLE = { high: true, medium: true, low: true, lowest: true };

/**
 * @param {{ kv?: number, status?: string, coords?: number[][], name?: string }} [opts]
 */
function feature({ kv = 132, status = 'Operational', coords, name } = {}) {
	return {
		type: 'Feature',
		properties: { capacitykv: kv, operationalstatus: status, ...(name && { name }) },
		geometry: {
			type: 'LineString',
			coordinates: coords ?? [
				[150, -33],
				[151, -34]
			]
		}
	};
}

describe('voltageBand', () => {
	it('maps kV thresholds to bands', () => {
		expect(voltageBand(500)).toBe('high');
		expect(voltageBand(400)).toBe('high');
		expect(voltageBand(330)).toBe('medium');
		expect(voltageBand(220)).toBe('medium');
		expect(voltageBand(132)).toBe('low');
		expect(voltageBand(110)).toBe('low');
		expect(voltageBand(66)).toBe('lowest');
		expect(voltageBand(11)).toBe('lowest');
	});
});

describe('alphaFor', () => {
	it('decreases with voltage tier', () => {
		expect(alphaFor('high')).toBeGreaterThan(alphaFor('medium'));
		expect(alphaFor('medium')).toBeGreaterThan(alphaFor('low'));
		expect(alphaFor('low')).toBeGreaterThan(alphaFor('lowest'));
	});
});

describe('proximityScoreFromGrid', () => {
	it('matches the linear-scan score for every test point', () => {
		const facilities = /** @type {[number, number][]} */ ([
			[150, -33],
			[151, -34],
			[133, -27],
			[145, -38]
		]);
		const grid = buildFacilityGrid(facilities);
		const probes = /** @type {[number, number][]} */ ([
			[150, -33],
			[150.2, -33],
			[155, -33],
			[140, -30],
			[133.05, -27.05]
		]);
		for (const p of probes) {
			expect(proximityScoreFromGrid(p, grid)).toBeCloseTo(proximityScore(p, facilities), 12);
		}
	});

	it('returns 0 on a null grid (empty input)', () => {
		expect(proximityScoreFromGrid([0, 0], buildFacilityGrid([]))).toBe(0);
		expect(proximityScoreFromGrid([0, 0], null)).toBe(0);
	});
});

describe('proximityScore', () => {
	it('returns 0 with no facilities', () => {
		expect(proximityScore([150, -33], [])).toBe(0);
		expect(proximityScore([150, -33], null)).toBe(0);
	});

	it('returns 1 right at a facility, 0 well beyond the FAR window', () => {
		const facilities = /** @type {[number, number][]} */ ([[150, -33]]);
		expect(proximityScore([150, -33], facilities)).toBe(1);
		expect(proximityScore([155, -33], facilities)).toBe(0);
	});

	it('returns a fractional value inside the gradient window', () => {
		const facilities = /** @type {[number, number][]} */ ([[150, -33]]);
		const mid = proximityScore([150.2, -33], facilities);
		expect(mid).toBeGreaterThan(0);
		expect(mid).toBeLessThan(1);
	});
});

describe('colourFor', () => {
	it('mixes from FAR_RGB to NEAR_RGB as proximity goes 0 → 1', () => {
		const cold = colourFor('high', 0).slice(0, 3);
		const hot = colourFor('high', 1).slice(0, 3);
		expect(cold).toEqual(FAR_RGB);
		expect(hot).toEqual(NEAR_RGB);
	});

	it('reuses alphaFor for the alpha channel', () => {
		expect(colourFor('high', 0)[3]).toBe(alphaFor('high'));
		expect(colourFor('lowest', 0)[3]).toBe(alphaFor('lowest'));
	});
});

describe('widthFor', () => {
	it('returns descending widths for descending voltage', () => {
		expect(widthFor('high')).toBeGreaterThan(widthFor('medium'));
		expect(widthFor('medium')).toBeGreaterThan(widthFor('low'));
		expect(widthFor('low')).toBeGreaterThan(widthFor('lowest'));
	});
});

describe('segmentTransmission', () => {
	it('returns an empty array for missing input', () => {
		expect(segmentTransmission(null, ALL_VISIBLE)).toEqual([]);
		expect(segmentTransmission({ features: [] }, ALL_VISIBLE)).toEqual([]);
	});

	it('emits N-1 segments for an N-coord LineString', () => {
		const fc = {
			features: [
				feature({
					coords: [
						[150, -33],
						[151, -34],
						[152, -35],
						[153, -36]
					]
				})
			]
		};
		const segments = segmentTransmission(fc, ALL_VISIBLE);
		expect(segments).toHaveLength(3);
		expect(segments[0].from).toEqual([150, -33]);
		expect(segments[0].to).toEqual([151, -34]);
		expect(segments[2].from).toEqual([152, -35]);
		expect(segments[2].to).toEqual([153, -36]);
	});

	it('drops non-Operational features', () => {
		const fc = {
			features: [feature({ status: 'Retired' }), feature({ status: 'Operational' })]
		};
		const segments = segmentTransmission(fc, ALL_VISIBLE);
		expect(segments).toHaveLength(1);
	});

	it('drops bands the user has toggled off', () => {
		const fc = {
			features: [
				feature({ kv: 500 }), // high
				feature({ kv: 132 }), // low
				feature({ kv: 22 }) // lowest
			]
		};
		const visibility = { high: true, medium: true, low: false, lowest: false };
		const segments = segmentTransmission(fc, visibility);
		expect(segments).toHaveLength(1);
		expect(segments[0].capacitykv).toBe(500);
	});

	it('skips degenerate geometries (fewer than 2 coords)', () => {
		const fc = {
			features: [
				{
					type: 'Feature',
					properties: { capacitykv: 132, operationalstatus: 'Operational' },
					geometry: { type: 'LineString', coordinates: [[150, -33]] }
				}
			]
		};
		expect(segmentTransmission(fc, ALL_VISIBLE)).toEqual([]);
	});

	it('forwards the feature name onto each segment', () => {
		const fc = {
			features: [
				feature({
					name: 'Taree-Stroud',
					coords: [
						[150, -33],
						[151, -34],
						[152, -35]
					]
				})
			]
		};
		const segments = segmentTransmission(fc, ALL_VISIBLE);
		expect(segments).toHaveLength(2);
		expect(segments[0].name).toBe('Taree-Stroud');
		expect(segments[1].name).toBe('Taree-Stroud');
	});

	it('shifts segment hue toward NEAR_RGB when a facility is right beside the segment midpoint', () => {
		const fc = {
			features: [
				feature({
					coords: [
						[150, -33],
						[151, -34]
					]
				})
			]
		};
		const midpoint = /** @type {[number, number]} */ ([150.5, -33.5]);
		const baseline = segmentTransmission(fc, ALL_VISIBLE);
		const hot = segmentTransmission(fc, ALL_VISIBLE, [midpoint]);
		// Without facilities → cold (blue family)
		expect(baseline[0].color.slice(0, 3)).toEqual(FAR_RGB);
		// With a facility on the midpoint → fully hot (red family)
		expect(hot[0].color.slice(0, 3)).toEqual(NEAR_RGB);
	});
});
