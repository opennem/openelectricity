// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { applyTrackerUrl, copiedTrackerUrl, parseTrackerUrl } from './tracker-url.js';

const validRegions = ['au', '_all', 'wem', 'nsw1'];
const context = { nowMs: 2_000_000_000_000, validRegions };

/** Apply state to a fresh URL, then parse it back. */
function roundTrip(state) {
	const url = applyTrackerUrl(new URL('https://example.test/tracker'), state);
	return { url, parsed: parseTrackerUrl(url.searchParams, context) };
}

describe('tracker URLs', () => {
	it('serialises the default state to a clean URL', () => {
		const { url, parsed } = roundTrip({
			region: '_all',
			group: 'simple',
			range: { kind: 'preset', days: 3, intervalId: '30m' },
			priceMode: 'price',
			emissionsMode: 'intensity',
			tablePanelOpen: true
		});
		expect(url.search).toBe('');
		expect(parsed).toMatchObject({
			region: '_all',
			group: 'simple',
			range: { kind: 'preset', days: 3, intervalId: '30m' },
			priceMode: 'price',
			emissionsMode: 'intensity',
			tablePanelOpen: true,
			fullscreen: true
		});
	});

	it('round trips non-default navigation state', () => {
		const state = {
			region: 'nsw1',
			group: 'detailed',
			range: { kind: 'preset', days: 7, intervalId: '5m' },
			priceMode: 'market_value',
			emissionsMode: 'volume',
			tablePanelOpen: false
		};
		const { parsed } = roundTrip(state);
		expect(parsed).toMatchObject(state);
	});

	it('round trips exact custom bounds', () => {
		const state = {
			region: 'wem',
			group: 'detailed',
			range: {
				kind: 'custom',
				startMs: 1_700_000_000_000,
				endMs: 1_700_086_400_000,
				intervalId: '30m'
			},
			priceMode: 'price',
			emissionsMode: 'volume',
			tablePanelOpen: true
		};
		const { parsed } = roundTrip(state);
		expect(parsed.range).toEqual(state.range);
	});

	it('never writes a price mode for the au scope', () => {
		const { url, parsed } = roundTrip({
			region: 'au',
			group: 'detailed',
			range: { kind: 'preset', days: 3, intervalId: '30m' },
			priceMode: 'market_value',
			emissionsMode: 'volume',
			tablePanelOpen: true
		});
		expect(url.searchParams.get('region')).toBe('au');
		expect(url.searchParams.has('price')).toBe(false);
		// The forced mode was never a user choice, so it parses back to default.
		expect(parsed.priceMode).toBe('price');
	});

	it('falls back on doctored regions, groups and intervals', () => {
		const params = new URLSearchParams('region=mars&group=fake&range=1y&interval=5m');
		const parsed = parseTrackerUrl(params, context);
		expect(parsed.region).toBe('_all');
		expect(parsed.group).toBe('simple');
		// 5m isn't offered at 1Y — the doctored interval drops to the tier default.
		expect(parsed.range).toEqual({ kind: 'preset', days: 365, intervalId: '1M' });
	});

	it('materialises copied links without mutating the source URL', () => {
		const source = new URL('https://example.test/tracker?region=nsw1');
		const copied = copiedTrackerUrl(source, {
			region: 'wem',
			group: 'detailed',
			range: { kind: 'preset', days: 3, intervalId: '30m' },
			priceMode: 'price',
			emissionsMode: 'volume',
			tablePanelOpen: true
		});
		expect(copied.searchParams.get('region')).toBe('wem');
		expect(source.searchParams.get('region')).toBe('nsw1');
	});

	it('round trips the calendar-period filter in the All range', () => {
		const { url, parsed } = roundTrip({
			region: '_all',
			group: 'simple',
			range: { kind: 'preset', days: -1, intervalId: '1M' },
			bucketFilter: 'jan',
			priceMode: 'price',
			emissionsMode: 'intensity',
			tablePanelOpen: true
		});
		expect(url.searchParams.get('filter')).toBe('jan');
		expect(parsed.bucketFilter).toBe('jan');
	});

	it('drops the filter outside the All tier or for mismatched grains', () => {
		// 7D preset — the filter is never offered there.
		const shortRange = roundTrip({
			region: '_all',
			group: 'simple',
			range: { kind: 'preset', days: 7, intervalId: '30m' },
			bucketFilter: 'jan',
			priceMode: 'price',
			emissionsMode: 'intensity',
			tablePanelOpen: true
		});
		expect(shortRange.url.searchParams.get('filter')).toBeNull();
		expect(shortRange.parsed.bucketFilter).toBeNull();

		// All range but a season filter over a monthly grain.
		const mismatched = parseTrackerUrl(
			new URLSearchParams('range=all&interval=1M&filter=summer'),
			context
		);
		expect(mismatched.bucketFilter).toBeNull();

		// Matched: season grain + season period, rolling variant included.
		const seasonal = parseTrackerUrl(
			new URLSearchParams('range=all&interval=12mr-season&filter=winter'),
			context
		);
		expect(seasonal.bucketFilter).toBe('winter');
	});
});
