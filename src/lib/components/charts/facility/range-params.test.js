import { describe, it, expect } from 'vitest';
import { parseRangeParams, applyRangeParams, rangeSlugFor } from './range-params.js';

const NOW = new Date('2026-07-10T00:00:00Z').getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

/** @param {string} qs */
function parse(qs) {
	return parseRangeParams(new URLSearchParams(qs), { nowMs: NOW });
}

describe('parseRangeParams', () => {
	it('returns null when no range params are present', () => {
		expect(parse('')).toBeNull();
		expect(parse('unit=BW01&fullscreen=false')).toBeNull();
	});

	it('parses preset ids case-insensitively', () => {
		expect(parse('range=7d')).toEqual({ kind: 'preset', days: 7, intervalId: null });
		expect(parse('range=30D')).toEqual({ kind: 'preset', days: 30, intervalId: null });
		expect(parse('range=all')).toEqual({ kind: 'preset', days: -1, intervalId: null });
	});

	it('keeps an interval that is valid for the preset', () => {
		expect(parse('range=7d&interval=5m')).toEqual({ kind: 'preset', days: 7, intervalId: '5m' });
		expect(parse('range=1y&interval=1M')).toEqual({ kind: 'preset', days: 365, intervalId: '1M' });
	});

	it('drops an interval that is not offered for the preset', () => {
		// 5m over "All" would be a pathological fetch — dropped, preset kept.
		expect(parse('range=all&interval=5m')).toEqual({ kind: 'preset', days: -1, intervalId: null });
		expect(parse('range=7d&interval=bogus')).toEqual({ kind: 'preset', days: 7, intervalId: null });
	});

	it('falls back to null for an unknown preset id', () => {
		expect(parse('range=99x')).toBeNull();
	});

	it('parses a custom start/end viewport', () => {
		const start = NOW - 5 * DAY_MS;
		const end = NOW - DAY_MS;
		expect(parse(`start=${start}&end=${end}&interval=30m`)).toEqual({
			kind: 'custom',
			startMs: start,
			endMs: end,
			intervalId: '30m'
		});
	});

	it('drops a custom interval invalid for the span', () => {
		const start = NOW - 400 * DAY_MS;
		const end = NOW - DAY_MS;
		// 5m is not offered for a ~400-day span.
		expect(parse(`start=${start}&end=${end}&interval=5m`)?.intervalId).toBeNull();
	});

	it('clamps a custom end to now', () => {
		const start = NOW - 2 * DAY_MS;
		const parsed = parse(`start=${start}&end=${NOW + 5 * DAY_MS}&interval=30m`);
		expect(parsed).toMatchObject({ kind: 'custom', startMs: start, endMs: NOW });
	});

	it('clamps a custom start to MIN_DATE', () => {
		const minMs = new Date('1998-12-01').getTime();
		const end = NOW - DAY_MS;
		const parsed = parse(`start=${minMs - 10 * DAY_MS}&end=${end}`);
		expect(parsed).toMatchObject({ kind: 'custom', startMs: minMs, endMs: end });
	});

	it('rejects non-numeric or inverted custom bounds', () => {
		expect(parse('start=abc&end=123')).toBeNull();
		expect(parse(`start=${NOW}&end=${NOW - DAY_MS}`)).toBeNull();
		expect(parse(`start=${NOW - DAY_MS}&end=${NOW - DAY_MS}`)).toBeNull();
	});

	it('lets a valid range win over start/end', () => {
		const start = NOW - 5 * DAY_MS;
		expect(parse(`range=7d&start=${start}&end=${NOW}`)).toEqual({
			kind: 'preset',
			days: 7,
			intervalId: null
		});
	});
});

describe('applyRangeParams', () => {
	/** @param {string} qs @param {any} state */
	function apply(qs, state) {
		const params = new URLSearchParams(qs);
		applyRangeParams(params, { defaultRangeDays: 3, ...state });
		return params.toString();
	}

	it('serialises the default state to no params', () => {
		expect(apply('', { selectedRange: 3, displayInterval: '30m', viewStart: 1, viewEnd: 2 })).toBe(
			''
		);
	});

	it('removes stale range params when back at the default state', () => {
		expect(
			apply('range=7d&interval=5m', {
				selectedRange: 3,
				displayInterval: '30m',
				viewStart: 1,
				viewEnd: 2
			})
		).toBe('');
	});

	it('writes a preset without interval when the interval is the preset default', () => {
		expect(apply('', { selectedRange: 7, displayInterval: '30m', viewStart: 1, viewEnd: 2 })).toBe(
			'range=7d'
		);
	});

	it('writes the interval when it differs from the preset default', () => {
		expect(apply('', { selectedRange: 7, displayInterval: '5m', viewStart: 1, viewEnd: 2 })).toBe(
			'range=7d&interval=5m'
		);
	});

	it('replaces start/end when switching to a preset', () => {
		expect(
			apply('start=1&end=2&interval=1d', {
				selectedRange: -1,
				displayInterval: '1M',
				viewStart: 1,
				viewEnd: 2
			})
		).toBe('range=all');
	});

	it('writes exact bounds plus interval for a custom viewport', () => {
		expect(
			apply('range=7d', {
				selectedRange: null,
				displayInterval: '1d',
				viewStart: 1000.4,
				viewEnd: 2000.6
			})
		).toBe('start=1000&end=2001&interval=1d');
	});

	it('preserves unrelated params', () => {
		expect(
			apply('unit=BW01&fullscreen=false', {
				selectedRange: 7,
				displayInterval: '30m',
				viewStart: 1,
				viewEnd: 2
			})
		).toBe('unit=BW01&fullscreen=false&range=7d');
	});
});

describe('rangeSlugFor', () => {
	it('uses the lowercased preset id when a preset is selected', () => {
		expect(
			rangeSlugFor({ selectedRange: 7, pickerStartDate: '2026-07-03', pickerEndDate: '2026-07-10' })
		).toBe('7d');
		expect(
			rangeSlugFor({
				selectedRange: -1,
				pickerStartDate: '1998-12-01',
				pickerEndDate: '2026-07-10'
			})
		).toBe('all');
	});

	it('uses the picker dates for a custom viewport', () => {
		expect(
			rangeSlugFor({
				selectedRange: null,
				pickerStartDate: '2026-06-01',
				pickerEndDate: '2026-06-14'
			})
		).toBe('2026-06-01-to-2026-06-14');
	});
});
