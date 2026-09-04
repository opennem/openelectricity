import { describe, expect, it } from 'vitest';
import {
	CURTAILMENT_COLOURS,
	CURTAILMENT_SERIES,
	curtailmentOverlayFor,
	TRACKER_OVERLAYS
} from './tracker-overlays.js';

describe('tracker overlays registry', () => {
	it('maps every curtailment series to a URL overlay in the canonical list', () => {
		for (const series of CURTAILMENT_SERIES) {
			expect(TRACKER_OVERLAYS).toContain(series.overlay);
			expect(curtailmentOverlayFor(series.id)).toBe(series.overlay);
			expect(CURTAILMENT_COLOURS[series.id]).toBe(series.colour);
		}
		expect(curtailmentOverlayFor('demand')).toBeNull();
	});

	it('stacks wind below solar so the bands never reorder with toggle order', () => {
		expect(CURTAILMENT_SERIES.map((series) => series.id)).toEqual([
			'curtailment_wind',
			'curtailment_solar'
		]);
	});
});
