import { describe, expect, it } from 'vitest';
import { plottedExtent } from './plotted-extent.js';

const HALF_HOUR = 30 * 60 * 1000;
const row = (/** @type {number} */ i, /** @type {number | null} */ value) => ({
	time: i * HALF_HOUR,
	solar: value,
	wind: null
});

describe('plottedExtent', () => {
	const snapshot = {
		seriesNames: ['solar', 'wind'],
		// The window's first period has no value yet; the last two are still to come.
		data: [row(0, null), row(1, 5), row(2, 6), row(3, 7), row(4, null), row(5, null)]
	};

	it('spans the first and last periods with a value, not the window', () => {
		expect(plottedExtent(snapshot, { start: 0, end: 5 * HALF_HOUR + 1000 })).toEqual({
			start: HALF_HOUR,
			end: 3 * HALF_HOUR
		});
	});

	it('keeps to the window', () => {
		expect(plottedExtent(snapshot, { start: 2 * HALF_HOUR, end: 2 * HALF_HOUR })).toEqual({
			start: 2 * HALF_HOUR,
			end: 2 * HALF_HOUR
		});
	});

	it('is null without data in the window', () => {
		expect(plottedExtent(null, { start: 0, end: 1 })).toBeNull();
		expect(plottedExtent(snapshot, { start: 4 * HALF_HOUR, end: 5 * HALF_HOUR })).toBeNull();
	});
});
