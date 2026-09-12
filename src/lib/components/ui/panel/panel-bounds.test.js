import { describe, expect, it } from 'vitest';
import { percentPanelBounds } from './panel-bounds.js';

describe('percentPanelBounds', () => {
	it('keeps a usable minimum width and reserves space beside the panel on wide layouts', () => {
		expect(
			percentPanelBounds({
				containerWidth: 1600,
				minPx: 320,
				reservedPx: 400,
				maxPct: 80,
				wide: true,
				narrowMaxPct: 80
			})
		).toEqual({ min: 20, max: 75 });
	});
	it('never lets the maximum fall below the minimum', () => {
		const bounds = percentPanelBounds({
			containerWidth: 500,
			minPx: 320,
			reservedPx: 400,
			maxPct: 80,
			wide: true,
			narrowMaxPct: 80
		});
		expect(bounds.max).toBe(bounds.min);
		expect(bounds.min).toBe(64);
	});
	it('falls back before the container is measured and on narrow layouts', () => {
		expect(
			percentPanelBounds({
				containerWidth: 0,
				minPx: 360,
				reservedPx: 360,
				maxPct: 65,
				wide: true,
				narrowMaxPct: 94
			})
		).toEqual({ min: 30, max: 94 });
		expect(
			percentPanelBounds({
				containerWidth: 400,
				minPx: 360,
				reservedPx: 360,
				maxPct: 65,
				wide: false,
				narrowMaxPct: 94
			})
		).toEqual({ min: 80, max: 94 });
	});
});
