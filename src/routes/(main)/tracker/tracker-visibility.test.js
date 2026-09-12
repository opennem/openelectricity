import { describe, expect, it } from 'vitest';
import { toggleOverlayVisibility, toggleSeriesVisibility } from './tracker-visibility.js';

const rowIds = ['coal', 'gas', 'wind'];
/** @param {string[]} hiddenSeries @param {import('./types.js').TrackerOverlay[]} overlays */
const state = (hiddenSeries, overlays) => ({ hiddenSeries, overlays, rowIds });

describe('tracker visibility', () => {
	it('toggles a series without touching the overlays', () => {
		const current = state(['gas'], ['demand']);
		expect(toggleSeriesVisibility(current, 'coal')).toEqual({
			hiddenSeries: ['gas', 'coal'],
			overlays: ['demand']
		});
		expect(toggleSeriesVisibility(current, 'gas')).toEqual({
			hiddenSeries: [],
			overlays: ['demand']
		});
	});
	it('restores everything instead of hiding the last visible series', () => {
		expect(toggleSeriesVisibility(state(['coal', 'gas'], ['demand']), 'wind')).toEqual({
			hiddenSeries: [],
			overlays: []
		});
	});
	it('solos a series by hiding the others and clearing overlays', () => {
		expect(toggleSeriesVisibility(state([], ['renewables']), 'gas', true)).toEqual({
			hiddenSeries: ['coal', 'wind'],
			overlays: []
		});
	});
	it('toggles an overlay without touching series visibility', () => {
		const current = state(['coal'], ['demand']);
		expect(toggleOverlayVisibility(current, 'renewables')).toEqual({
			hiddenSeries: ['coal'],
			overlays: ['demand', 'renewables']
		});
		expect(toggleOverlayVisibility(current, 'demand')).toEqual({
			hiddenSeries: ['coal'],
			overlays: []
		});
	});
	it('solos an overlay by hiding every series', () => {
		expect(toggleOverlayVisibility(state([], ['demand']), 'curtailment-wind', true)).toEqual({
			hiddenSeries: rowIds,
			overlays: ['curtailment-wind']
		});
	});
});
