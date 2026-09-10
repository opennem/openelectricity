// @ts-nocheck
import { describe, expect, it } from 'vitest';
import {
	applyTrackerUrl,
	copiedTrackerUrl,
	parseTrackerUrl,
	normaliseHiddenSeries
} from './tracker-url.js';
import { GROUP_OPTIONS, getGroup } from '$lib/components/charts/network/groups.js';

const context = { nowMs: 2_000_000_000_000 };

/** Apply state to a fresh URL, then parse it back. */
function roundTrip(state) {
	const url = applyTrackerUrl(new URL('https://example.test/tracker'), state);
	return { url, parsed: parseTrackerUrl(url.searchParams, context) };
}

describe('tracker URLs', () => {
	it('defaults legacy links to visible sources, demand contribution and absolute transforms', () => {
		expect(parseTrackerUrl(new URLSearchParams('region=nsw1'), context)).toMatchObject({
			hiddenSeries: [],
			contributionMode: 'demand',
			generationTransform: 'absolute',
			marketValueTransform: 'absolute'
		});
	});

	it.each(['absolute', 'proportion', 'changeSince'])(
		'round trips both chart transforms: %s',
		(transform) => {
			const state = {
				...parseTrackerUrl(new URLSearchParams(), context),
				hiddenSeries: ['wind', 'coal', 'coal'],
				contributionMode: 'generation',
				generationTransform: transform,
				marketValueTransform: transform
			};
			const { url, parsed } = roundTrip(state);
			expect(parsed).toMatchObject({ ...state, hiddenSeries: ['coal', 'wind'] });
			expect(url.searchParams.get('hidden')).toBe('coal,wind');
			expect(url.searchParams.get('contribution')).toBe('generation');
			expect(url.searchParams.get('transform')).toBe(transform === 'absolute' ? null : transform);
			expect(url.searchParams.get('market-transform')).toBe(
				transform === 'absolute' ? null : transform
			);
		}
	);

	it('validates hidden IDs against the grouping and ignores malformed analytical values', () => {
		const parsed = parseTrackerUrl(
			new URLSearchParams(
				'group=simple&hidden=coal_black,wind,wind,,__proto__,%20coal%20&contribution=net&transform=log&market-transform=NaN'
			),
			context
		);
		expect(parsed.hiddenSeries).toEqual(['coal', 'wind']);
		expect(parsed).toMatchObject({
			contributionMode: 'demand',
			generationTransform: 'absolute',
			marketValueTransform: 'absolute'
		});
		expect(
			parseTrackerUrl(new URLSearchParams('group=detailed&hidden=coal,coal_black,wind'), context)
				.hiddenSeries
		).toEqual(normaliseHiddenSeries(['coal_black', 'wind'], 'detailed'));
	});

	it.each(GROUP_OPTIONS.map(({ value }) => value))(
		'accepts all-hidden selections in %s without inventing IDs',
		(group) => {
			const ids = getGroup(group).order;
			expect(normaliseHiddenSeries([...ids].reverse().concat(ids), group)).toEqual(ids);
			expect(normaliseHiddenSeries(null, group)).toEqual([]);
		}
	);

	it('removes analytical defaults and stale parameters when restoring the default view', () => {
		const state = parseTrackerUrl(new URLSearchParams(), context);
		const url = copiedTrackerUrl(
			new URL(
				'https://example.test/tracker?hidden=coal&contribution=demand&transform=proportion&market-transform=changeSince&fullscreen=false&utm_source=test'
			),
			state
		);
		for (const key of ['hidden', 'contribution', 'transform', 'market-transform'])
			expect(url.searchParams.has(key)).toBe(false);
		expect(url.searchParams.get('fullscreen')).toBe('false');
		expect(url.searchParams.get('utm_source')).toBe('test');
	});

	it('copied links retain analytical selections and exact custom bounds without changing the source', () => {
		const source = new URL('https://example.test/tracker');
		const state = {
			...parseTrackerUrl(source.searchParams, context),
			hiddenSeries: ['coal'],
			contributionMode: 'demand',
			generationTransform: 'changeSince',
			marketValueTransform: 'proportion',
			range: {
				kind: 'custom',
				startMs: 1_700_000_000_000,
				endMs: 1_700_086_400_000,
				intervalId: '30m'
			}
		};
		const copied = copiedTrackerUrl(source, state);
		expect(parseTrackerUrl(copied.searchParams, context)).toEqual(state);
		expect(source.search).toBe('');
	});

	it('keeps explicit demand links readable and removes the redundant default when copied', () => {
		const source = new URL('https://example.test/tracker?contribution=demand');
		const state = parseTrackerUrl(source.searchParams, context);
		expect(state.contributionMode).toBe('demand');
		const copied = copiedTrackerUrl(source, state);
		expect(copied.searchParams.has('contribution')).toBe(false);
		expect(parseTrackerUrl(copied.searchParams, context).contributionMode).toBe('demand');
	});

	it('serialises the default state to a clean URL', () => {
		const { url, parsed } = roundTrip({
			region: '_all',
			group: 'simple',
			range: { kind: 'preset', days: 3, intervalId: '30m' },
			priceMode: 'price',
			emissionsMode: 'intensity',
			overlays: [],
			tablePanelOpen: true
		});
		expect(url.search).toBe('');
		expect(parsed).toMatchObject({
			region: '_all',
			group: 'simple',
			range: { kind: 'preset', days: 3, intervalId: '30m' },
			priceMode: 'price',
			emissionsMode: 'intensity',
			overlays: [],
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
			overlays: ['demand', 'renewables'],
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
			overlays: [],
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
			overlays: [],
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
			overlays: ['demand'],
			tablePanelOpen: true
		});
		expect(copied.searchParams.get('region')).toBe('wem');
		expect(copied.searchParams.get('overlay')).toBe('demand');
		expect(source.searchParams.get('region')).toBe('nsw1');
		expect(source.searchParams.has('overlay')).toBe(false);
	});

	it('normalises supported overlays into a canonical single parameter', () => {
		const parsed = parseTrackerUrl(
			new URLSearchParams(
				'overlay=curtailment-wind,demand,unknown,renewables,demand,curtailment-solar'
			),
			context
		);
		expect(parsed.overlays).toEqual([
			'demand',
			'renewables',
			'curtailment-solar',
			'curtailment-wind'
		]);

		const { url, parsed: reparsed } = roundTrip({
			region: '_all',
			group: 'simple',
			range: { kind: 'preset', days: 3, intervalId: '30m' },
			priceMode: 'price',
			emissionsMode: 'intensity',
			overlays: parsed.overlays,
			tablePanelOpen: true
		});
		expect(url.searchParams.get('overlay')).toBe(
			'demand,renewables,curtailment-solar,curtailment-wind'
		);
		expect(reparsed.overlays).toEqual(parsed.overlays);
	});

	it('removes the overlay parameter when the final overlay is disabled', () => {
		const url = applyTrackerUrl(new URL('https://example.test/tracker?overlay=demand'), {
			region: '_all',
			group: 'simple',
			range: { kind: 'preset', days: 3, intervalId: '30m' },
			priceMode: 'price',
			emissionsMode: 'intensity',
			overlays: [],
			tablePanelOpen: true
		});
		expect(url.searchParams.has('overlay')).toBe(false);
	});

	it('round trips the calendar-period filter in the All range', () => {
		const { url, parsed } = roundTrip({
			region: '_all',
			group: 'simple',
			range: { kind: 'preset', days: -1, intervalId: '1M' },
			bucketFilter: 'jan',
			priceMode: 'price',
			emissionsMode: 'intensity',
			overlays: [],
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
			overlays: [],
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
