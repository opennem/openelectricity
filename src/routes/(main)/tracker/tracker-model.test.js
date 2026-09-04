// @ts-nocheck
import { describe, expect, it } from 'vitest';
import {
	DEFAULT_RANGE_DAYS,
	isAllTierRange,
	normaliseEmissionsMode,
	normaliseRange,
	rangeSnapshotBounds,
	rangeSpanDays,
	resolvePriceMode
} from './tracker-model.js';

const DAY = 24 * 60 * 60 * 1000;

describe('tracker card modes', () => {
	it('normalises unknown emissions modes to intensity', () => {
		expect(normaliseEmissionsMode('volume')).toBe('volume');
		expect(normaliseEmissionsMode('doctored')).toBe('intensity');
		expect(normaliseEmissionsMode(undefined)).toBe('intensity');
	});

	it('forces market value for the au scope without touching the selection', () => {
		expect(resolvePriceMode('au', 'price')).toBe('market_value');
		expect(resolvePriceMode('au', 'market_value')).toBe('market_value');
		expect(resolvePriceMode('nsw1', 'price')).toBe('price');
		expect(resolvePriceMode('_all', 'market_value')).toBe('market_value');
	});
});

describe('tracker range normalisation', () => {
	it('falls back to the 3-day preset with its default interval', () => {
		expect(normaliseRange(null)).toEqual({ kind: 'preset', days: 3, intervalId: '30m' });
		expect(DEFAULT_RANGE_DAYS).toBe(3);
	});

	it('defaults a preset interval from the preset tier', () => {
		expect(normaliseRange({ kind: 'preset', days: 365, intervalId: null })).toEqual({
			kind: 'preset',
			days: 365,
			intervalId: '1M'
		});
	});

	it('rejects a day count that matches no preset', () => {
		expect(normaliseRange({ kind: 'preset', days: 12 })).toEqual({
			kind: 'preset',
			days: 3,
			intervalId: '30m'
		});
	});

	it('defaults a custom interval from the span tier', () => {
		const range = normaliseRange({ kind: 'custom', startMs: 0, endMs: 40 * DAY });
		expect(range).toEqual({ kind: 'custom', startMs: 0, endMs: 40 * DAY, intervalId: '1d' });
	});

	it('rejects inverted custom bounds', () => {
		expect(normaliseRange({ kind: 'custom', startMs: 10, endMs: 5 }).kind).toBe('preset');
	});
});

describe('range span maths', () => {
	it('rounds a span up to whole days, never below one', () => {
		expect(rangeSpanDays(0, DAY)).toBe(1);
		expect(rangeSpanDays(0, DAY + 1)).toBe(2);
		expect(rangeSpanDays(0, 0)).toBe(1);
	});

	it('places only the All preset and very long custom spans in the All tier', () => {
		expect(isAllTierRange({ kind: 'preset', days: -1, intervalId: '1M' })).toBe(true);
		expect(isAllTierRange({ kind: 'preset', days: 365, intervalId: '1M' })).toBe(false);
		expect(isAllTierRange({ kind: 'custom', startMs: 0, endMs: 600 * DAY, intervalId: '1M' })).toBe(
			true
		);
		expect(isAllTierRange({ kind: 'custom', startMs: 0, endMs: 400 * DAY, intervalId: '1M' })).toBe(
			false
		);
	});

	it('anchors presets at now and passes custom bounds through', () => {
		const nowMs = 2_000_000_000_000;
		expect(rangeSnapshotBounds({ kind: 'preset', days: 7, intervalId: '30m' }, nowMs)).toEqual({
			startMs: nowMs - 7 * DAY,
			endMs: nowMs
		});
		expect(
			rangeSnapshotBounds({ kind: 'custom', startMs: 1, endMs: 2, intervalId: '30m' }, nowMs)
		).toEqual({ startMs: 1, endMs: 2 });
	});

	it('spans the All preset back to the earliest data date in whole days', () => {
		const nowMs = Date.UTC(2026, 0, 1);
		const { startMs, endMs } = rangeSnapshotBounds(
			{ kind: 'preset', days: -1, intervalId: '1M' },
			nowMs
		);
		expect(endMs).toBe(nowMs);
		expect(startMs).toBeLessThanOrEqual(Date.UTC(1998, 11, 1));
		expect(nowMs - startMs).toBeLessThan(Date.UTC(2026, 0, 1) - Date.UTC(1998, 11, 1) + DAY);
	});
});
