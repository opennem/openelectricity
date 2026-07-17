import { describe, it, expect } from 'vitest';
import {
	getMetricIntervalForDays,
	getHysteresisSwitch,
	getHysteresisTarget,
	getDisplayIntervalForDays,
	POWER_THRESHOLD,
	MONTHLY_THRESHOLD,
	YEARLY_THRESHOLD
} from './metric-interval.js';

describe('getMetricIntervalForDays', () => {
	it('maps duration to a native interval (no 3M in the auto ladder)', () => {
		expect(getMetricIntervalForDays(1)).toEqual({ metric: 'power', interval: '5m' });
		expect(getMetricIntervalForDays(9)).toEqual({ metric: 'power', interval: '5m' });
		expect(getMetricIntervalForDays(10)).toEqual({ metric: 'energy', interval: '1d' });
		expect(getMetricIntervalForDays(364)).toEqual({ metric: 'energy', interval: '1d' });
		expect(getMetricIntervalForDays(365)).toEqual({ metric: 'energy', interval: '1M' });
		expect(getMetricIntervalForDays(1824)).toEqual({ metric: 'energy', interval: '1M' });
		expect(getMetricIntervalForDays(1825)).toEqual({ metric: 'energy', interval: '1y' });
		expect(getMetricIntervalForDays(20000)).toEqual({ metric: 'energy', interval: '1y' });
	});

	it('only ever emits native intervals', () => {
		const native = new Set(['5m', '1d', '1M', '1y']);
		for (const d of [1, 30, 200, 400, 1000, 2000, 12000]) {
			expect(native.has(getMetricIntervalForDays(d).interval)).toBe(true);
		}
	});
});

describe('getHysteresisSwitch', () => {
	it('zooms out through the native ladder', () => {
		expect(getHysteresisSwitch('power', '5m', POWER_THRESHOLD)).toEqual({
			metric: 'energy',
			interval: '1d'
		});
		expect(getHysteresisSwitch('energy', '1d', MONTHLY_THRESHOLD)).toEqual({
			metric: 'energy',
			interval: '1M'
		});
		expect(getHysteresisSwitch('energy', '1M', YEARLY_THRESHOLD)).toEqual({
			metric: 'energy',
			interval: '1y'
		});
	});

	it('zooms in through the native ladder', () => {
		expect(getHysteresisSwitch('energy', '1y', 1499)).toEqual({ metric: 'energy', interval: '1M' });
		expect(getHysteresisSwitch('energy', '1M', 299)).toEqual({ metric: 'energy', interval: '1d' });
		expect(getHysteresisSwitch('energy', '1d', 8)).toEqual({ metric: 'power', interval: '5m' });
	});

	it('does not flip inside the hysteresis dead-band', () => {
		// 1d at 320 days: above the 300 zoom-in floor and below the 365 zoom-out
		// ceiling → no switch.
		expect(getHysteresisSwitch('energy', '1d', 320)).toBeNull();
		// 1M at 1600 days: above 1500 zoom-in floor, below 1825 zoom-out → no switch.
		expect(getHysteresisSwitch('energy', '1M', 1600)).toBeNull();
		// power at 9 days: below the 10 zoom-out threshold → no switch.
		expect(getHysteresisSwitch('power', '5m', 9)).toBeNull();
		// 1d at 9 days: above the 8 zoom-in floor, below the 10 zoom-out → no switch.
		expect(getHysteresisSwitch('energy', '1d', 9)).toBeNull();
	});

	it('never targets a non-native interval', () => {
		const native = new Set(['5m', '1d', '1M', '1y']);
		for (const [m, i] of [
			['power', '5m'],
			['energy', '1d'],
			['energy', '1M'],
			['energy', '1y']
		]) {
			for (const d of [1, 20, 400, 1000, 2000, 9000]) {
				const r = getHysteresisSwitch(m, i, d);
				if (r) expect(native.has(r.interval)).toBe(true);
			}
		}
	});
});

describe('getHysteresisTarget', () => {
	it('walks several rungs when a settled gesture crossed multiple thresholds', () => {
		// Deep zoom from "All" (energy/1y) straight to a month — a single
		// getHysteresisSwitch step stops at 1M; the target must reach 1d.
		expect(getHysteresisTarget('energy', '1y', 30)).toEqual({ metric: 'energy', interval: '1d' });
		// …and all the way to power for a days-wide viewport.
		expect(getHysteresisTarget('energy', '1y', 3)).toEqual({ metric: 'power', interval: '5m' });
		// Zoom-out from power to a decade viewport walks up to 1y.
		expect(getHysteresisTarget('power', '5m', 4000)).toEqual({ metric: 'energy', interval: '1y' });
	});

	it('returns null when no switch is needed', () => {
		expect(getHysteresisTarget('energy', '1d', 100)).toBeNull();
		expect(getHysteresisTarget('power', '5m', 3)).toBeNull();
	});

	it('preserves the per-rung hysteresis gap at the final rung', () => {
		// 9 days sits in the 1d↔5m hysteresis gap (switch to power only at ≤8):
		// from above, the walk stops at 1d rather than overshooting to 5m…
		expect(getHysteresisTarget('energy', '1y', 9)).toEqual({ metric: 'energy', interval: '1d' });
		// …and an existing 1d viewport at 9 days stays put.
		expect(getHysteresisTarget('energy', '1d', 9)).toBeNull();
	});
});

describe('getDisplayIntervalForDays', () => {
	it('power renders 5m raw or 30m averaged', () => {
		expect(getDisplayIntervalForDays('power', '5m', 1)).toBe('5m');
		expect(getDisplayIntervalForDays('power', '5m', 3)).toBe('30m');
	});

	it('daily energy renders 1d, or 1M past a year', () => {
		expect(getDisplayIntervalForDays('energy', '1d', 100)).toBe('1d');
		expect(getDisplayIntervalForDays('energy', '1d', 400)).toBe('1M');
	});

	it('native coarse intervals render at their own grain', () => {
		expect(getDisplayIntervalForDays('energy', '1M', 1000)).toBe('1M');
		expect(getDisplayIntervalForDays('energy', '1y', 5000)).toBe('1y');
	});
});
