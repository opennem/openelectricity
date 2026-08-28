import { describe, expect, it, vi } from 'vitest';

vi.mock('openelectricity', () => ({
	OpenElectricityClient: class {
		getMarket = vi.fn();
		getNetworkData = vi.fn();
	},
	NoDataFound: class NoDataFound extends Error {}
}));

import {
	HISTORICAL_FRESH_MS,
	LIVE_FRESH_MS,
	NETWORK_DATA_KEY_PREFIX,
	cacheKeyFor,
	describeCacheKey,
	parseNetworkDataParams,
	parseRegisteredKey
} from './network-data.js';

/** @param {string} search */
const parse = (search) => parseNetworkDataParams(new URLSearchParams(search));

describe('parseNetworkDataParams', () => {
	it('applies the endpoint defaults', () => {
		const result = parse('');
		expect('params' in result && result.params).toMatchObject({
			region: '_all',
			metric: 'power',
			interval: '5m',
			networkId: 'NEM'
		});
	});

	it('resolves the network target for regions', () => {
		const wem = parse('region=wem');
		expect('params' in wem && wem.params).toMatchObject({ networkId: 'WEM' });
		const nsw = parse('region=nsw1');
		expect('params' in nsw && nsw.params).toMatchObject({
			networkId: 'NEM',
			networkRegion: 'NSW1'
		});
	});

	it('accepts the synthetic volume-weighted price metric', () => {
		const result = parse('metric=price_vw&interval=1M');
		expect('params' in result && result.params).toMatchObject({
			metric: 'price_vw',
			interval: '1M'
		});
	});

	it('rejects each invalid parameter with the endpoint message', () => {
		expect(parse('region=unknown')).toEqual({ error: 'Invalid region: unknown' });
		expect(parse('interval=2h')).toEqual({ error: 'Invalid interval: 2h' });
		expect(parse('metric=unknown')).toEqual({ error: 'Invalid metric: unknown' });
		expect(parse('primary_grouping=fueltech')).toEqual({
			error: 'Invalid primary grouping: fueltech'
		});
		expect(parse('date_start=01/01/2024')).toEqual({ error: 'Invalid date range.' });
		expect(parse('date_start=2024-01-02&date_end=2024-01-01')).toEqual({
			error: 'Invalid date range.'
		});
		expect(parse('region=au&metric=price')).toEqual({
			error: 'A national spot price is not available.'
		});
	});

	it('rejects over-wide fine-grained ranges via the API limits', () => {
		const result = parse('interval=5m&date_start=2026-01-01&date_end=2026-02-15');
		expect('error' in result && result.error).toBeTruthy();
	});
});

describe('cacheKeyFor', () => {
	it('writes parameters in a fixed order regardless of input order', () => {
		const key = cacheKeyFor({
			region: 'nsw1',
			metric: 'power',
			interval: '5m',
			primaryGrouping: 'network_region',
			dateEnd: '2024-01-02T00:00:00',
			dateStart: '2024-01-01T00:00:00'
		});
		expect(key).toBe(
			'region=nsw1&metric=power&interval=5m&date_start=2024-01-01T00%3A00%3A00&date_end=2024-01-02T00%3A00%3A00&primary_grouping=network_region'
		);
	});

	it('omits absent optional parameters', () => {
		expect(cacheKeyFor({ region: '_all', metric: 'power', interval: '5m' })).toBe(
			'region=_all&metric=power&interval=5m'
		);
	});
});

describe('describeCacheKey', () => {
	it('classifies a windowless query as live', () => {
		const described = describeCacheKey('region=_all&metric=power&interval=5m');
		expect(described).toMatchObject({
			cacheKey: `${NETWORK_DATA_KEY_PREFIX}?region=_all&metric=power&interval=5m`,
			canonicalQuery: 'region=_all&metric=power&interval=5m',
			region: '_all',
			metric: 'power',
			interval: '5m',
			isHistorical: false,
			freshMs: LIVE_FRESH_MS
		});
		expect(described.dateStart).toBeUndefined();
	});

	it('classifies a long-closed window as historical', () => {
		const described = describeCacheKey(
			'region=nsw1&metric=energy&interval=1M&date_start=2020-01-01&date_end=2021-01-01'
		);
		expect(described).toMatchObject({
			dateStart: '2020-01-01',
			dateEnd: '2021-01-01',
			isHistorical: true,
			freshMs: HISTORICAL_FRESH_MS
		});
	});
});

describe('parseRegisteredKey', () => {
	const canonical = cacheKeyFor({
		region: 'vic1',
		metric: 'energy',
		interval: '1d',
		dateStart: '2024-01-01T00:00:00',
		dateEnd: '2024-02-01T00:00:00'
	});

	it('round-trips a canonical key', () => {
		const parsed = parseRegisteredKey(`${NETWORK_DATA_KEY_PREFIX}?${canonical}`);
		expect(parsed?.canonical).toBe(canonical);
		expect(parsed?.params).toMatchObject({
			region: 'vic1',
			metric: 'energy',
			interval: '1d',
			dateStart: '2024-01-01T00:00:00',
			dateEnd: '2024-02-01T00:00:00',
			networkId: 'NEM'
		});
	});

	it('rejects a foreign prefix', () => {
		expect(parseRegisteredKey(`https://example.com/other-v1?${canonical}`)).toBeNull();
	});

	it('rejects reordered parameters', () => {
		expect(
			parseRegisteredKey(`${NETWORK_DATA_KEY_PREFIX}?metric=power&region=_all&interval=5m`)
		).toBeNull();
	});

	it('rejects extra parameters', () => {
		expect(
			parseRegisteredKey(`${NETWORK_DATA_KEY_PREFIX}?region=_all&metric=power&interval=5m&x=1`)
		).toBeNull();
	});

	it('rejects invalid parameter values', () => {
		expect(
			parseRegisteredKey(`${NETWORK_DATA_KEY_PREFIX}?region=mars&metric=power&interval=5m`)
		).toBeNull();
	});

	it('rejects non-strings and bare prefixes', () => {
		expect(parseRegisteredKey(/** @type {any} */ (undefined))).toBeNull();
		expect(parseRegisteredKey(NETWORK_DATA_KEY_PREFIX)).toBeNull();
	});
});
