import { describe, it, expect } from 'vitest';
import {
	INTERVAL_SPEC,
	RANGE_PRESETS,
	RANGE_INTERVALS,
	getIntervalSpec,
	getIntervalsForRange,
	getDefaultIntervalForRange,
	getIntervalOptionsForDays,
	getPresetByDays
} from './range-interval-config.js';

// Mirror of VALID_INTERVALS in src/routes/api/facilities/[code]/power/+server.js —
// every apiInterval the config fetches must be whitelisted there.
const VALID_API_INTERVALS = ['5m', '1h', '1d', '7d', '1M', '3M', '1y'];

describe('range-interval-config integrity', () => {
	it('every range default is one of its options', () => {
		for (const [id, { options, default: def }] of Object.entries(RANGE_INTERVALS)) {
			expect(options, `${id} default`).toContain(def);
		}
	});

	it('every range option exists in INTERVAL_SPEC', () => {
		for (const { options } of Object.values(RANGE_INTERVALS)) {
			for (const id of options) {
				expect(INTERVAL_SPEC[id], `spec for ${id}`).toBeDefined();
			}
		}
	});

	it('every spec apiInterval is whitelisted by the API route', () => {
		for (const [id, spec] of Object.entries(INTERVAL_SPEC)) {
			expect(VALID_API_INTERVALS, `apiInterval for ${id}`).toContain(spec.apiInterval);
		}
	});

	it('every preset has a RANGE_INTERVALS entry', () => {
		for (const preset of RANGE_PRESETS) {
			expect(RANGE_INTERVALS[preset.id], preset.id).toBeDefined();
		}
	});

	it('aggregated intervals fetch a finer native grain than they display', () => {
		// season/half/fy fetch monthly; 30m fetches 5m.
		expect(INTERVAL_SPEC.season.apiInterval).toBe('1M');
		expect(INTERVAL_SPEC.half.apiInterval).toBe('1M');
		expect(INTERVAL_SPEC.fy.apiInterval).toBe('1M');
		expect(INTERVAL_SPEC['30m'].apiInterval).toBe('5m');
		// quarter uses native 3M (no aggregation).
		expect(INTERVAL_SPEC.quarter.apiInterval).toBe('3M');
		expect(INTERVAL_SPEC.quarter.aggregate).toBeNull();
	});
});

describe('helpers', () => {
	it('getIntervalSpec / getDefaultIntervalForRange', () => {
		expect(getIntervalSpec('1M')?.label).toBe('Month');
		expect(getDefaultIntervalForRange('ALL')).toBe('1M');
		expect(getIntervalsForRange('1D').options).toEqual(['5m', '30m']);
	});

	it('30D offers Hourly + Daily, with Hourly fetched natively', () => {
		expect(getIntervalsForRange('30D').options).toEqual(['1h', '1d']);
		expect(getDefaultIntervalForRange('30D')).toBe('1d');
		const hourly = getIntervalSpec('1h');
		expect(hourly?.apiInterval).toBe('1h'); // native, no aggregation
		expect(hourly?.aggregate).toBeNull();
		// Anything coarser than 30m is energy, not power.
		expect(hourly?.metric).toBe('energy');
	});

	it('getPresetByDays matches preset day counts', () => {
		expect(getPresetByDays(30)?.id).toBe('30D');
		expect(getPresetByDays(-1)?.id).toBe('ALL');
		expect(getPresetByDays(999)).toBeUndefined();
	});

	it('getIntervalOptionsForDays buckets custom spans into preset tiers', () => {
		expect(getIntervalOptionsForDays(1)).toBe(RANGE_INTERVALS['1D']);
		expect(getIntervalOptionsForDays(10)).toBe(RANGE_INTERVALS['7D']);
		expect(getIntervalOptionsForDays(45)).toBe(RANGE_INTERVALS['30D']);
		expect(getIntervalOptionsForDays(200)).toBe(RANGE_INTERVALS['1Y']);
		expect(getIntervalOptionsForDays(5000)).toBe(RANGE_INTERVALS['ALL']);
	});
});
