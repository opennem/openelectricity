// @ts-nocheck
import { describe, expect, it } from 'vitest';
import {
	DEFAULT_RANGE_DAYS,
	normaliseEmissionsMode,
	normalisePriceMode,
	normaliseRange,
	resolvePriceMode
} from './tracker-model.js';

describe('tracker card modes', () => {
	it('normalises unknown modes to their defaults', () => {
		expect(normalisePriceMode('market_value')).toBe('market_value');
		expect(normalisePriceMode('mv')).toBe('price');
		expect(normalisePriceMode(undefined)).toBe('price');
		expect(normaliseEmissionsMode('volume')).toBe('volume');
		expect(normaliseEmissionsMode('doctored')).toBe('intensity');
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
		const day = 24 * 60 * 60 * 1000;
		const range = normaliseRange({ kind: 'custom', startMs: 0, endMs: 40 * day });
		expect(range).toEqual({ kind: 'custom', startMs: 0, endMs: 40 * day, intervalId: '1d' });
	});

	it('rejects inverted custom bounds', () => {
		expect(normaliseRange({ kind: 'custom', startMs: 10, endMs: 5 }).kind).toBe('preset');
	});
});
