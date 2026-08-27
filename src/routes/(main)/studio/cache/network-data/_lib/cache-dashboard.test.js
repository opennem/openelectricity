import { describe, expect, it } from 'vitest';
import {
	filtersToSearchParams,
	formatBytes,
	formatDeadline,
	formatDuration,
	hrefFor,
	jsonFilename,
	jsonSearchMatches,
	listQueryString,
	needsRefreshConfirm,
	parseFilters,
	presentRefreshFailure,
	presentRefreshResult
} from './cache-dashboard.js';

const DEFAULTS = {
	region: '',
	metric: '',
	interval: '',
	window: '',
	freshness: '',
	q: '',
	page: 1
};

describe('filter state', () => {
	it('parses defaults from an empty URL', () => {
		expect(parseFilters(new URLSearchParams())).toEqual(DEFAULTS);
	});

	it('round-trips through search params, omitting defaults', () => {
		const filters = { ...DEFAULTS, region: 'nsw1', freshness: 'stale', q: 'power', page: 3 };
		const params = filtersToSearchParams(filters);
		expect(params.toString()).toBe('region=nsw1&freshness=stale&q=power&page=3');
		expect(parseFilters(params)).toEqual(filters);
	});

	it('ignores invalid page values', () => {
		expect(parseFilters(new URLSearchParams('page=0')).page).toBe(1);
		expect(parseFilters(new URLSearchParams('page=abc')).page).toBe(1);
	});

	it('builds dashboard hrefs preserving the selected entry', () => {
		expect(hrefFor(DEFAULTS)).toBe('/studio/cache/network-data');
		expect(hrefFor({ ...DEFAULTS, region: 'wem' }, 'https://x/y?a=1')).toBe(
			'/studio/cache/network-data?region=wem&key=https%3A%2F%2Fx%2Fy%3Fa%3D1'
		);
	});

	it('excludes the selected entry from the list query string', () => {
		expect(listQueryString({ ...DEFAULTS, metric: 'energy', page: 2 })).toBe(
			'metric=energy&page=2'
		);
	});
});

describe('formatters', () => {
	it('formats byte sizes', () => {
		expect(formatBytes(null)).toBe('–');
		expect(formatBytes(512)).toBe('512 B');
		expect(formatBytes(48_213)).toBe('47.1 kB');
		expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB');
	});

	it('formats durations at increasing grains', () => {
		expect(formatDuration(null)).toBe('–');
		expect(formatDuration(840)).toBe('840 ms');
		expect(formatDuration(2_400)).toBe('2.4 s');
		expect(formatDuration(35 * 60 * 1000)).toBe('35 min');
		expect(formatDuration(5.2 * 60 * 60 * 1000)).toBe('5.2 h');
		expect(formatDuration(3.1 * 24 * 60 * 60 * 1000)).toBe('3.1 d');
	});

	it('formats deadlines relative to now', () => {
		const now = 1_000_000_000;
		expect(formatDeadline(now + 4 * 60 * 1000, now)).toBe('in 4 min');
		expect(formatDeadline(now - 2_500, now)).toBe('2.5 s overdue');
	});
});

describe('refresh presentation', () => {
	it('requires confirmation only for historical entries', () => {
		expect(needsRefreshConfirm({ isHistorical: true })).toBe(true);
		expect(needsRefreshConfirm({ isHistorical: false })).toBe(false);
	});

	it('presents a stored refresh as success', () => {
		const presented = presentRefreshResult({ stored: true, sizeBytes: 2048, durationMs: 1500 });
		expect(presented.tone).toBe('success');
		expect(presented.message).toContain('1.5 s');
		expect(presented.message).toContain('2.0 kB');
	});

	it('warns when the fetch succeeded but nothing could be stored', () => {
		expect(presentRefreshResult({ stored: false, sizeBytes: null, durationMs: null }).tone).toBe(
			'warning'
		);
	});

	it('presents failures with the preserved cached response', () => {
		const presented = presentRefreshFailure({
			message: 'Request failed (502)',
			body: { error: 'upstream down', cached: { storedAt: 1_700_000_000_000, status: 'stale' } }
		});
		expect(presented.tone).toBe('error');
		expect(presented.message).toBe('upstream down');
		expect(presented.preserved).toContain('is preserved');
		expect(presented.preserved).toContain('stale');
	});

	it('states when no cached response is held locally', () => {
		const presented = presentRefreshFailure({ message: 'boom', body: { cached: null } });
		expect(presented.message).toBe('boom');
		expect(presented.preserved).toContain('no cached response');
	});
});

describe('json helpers', () => {
	it('finds matching lines case-insensitively with a cap', () => {
		const lines = ['{', '  "Region": "nsw1",', '  "metric": "power"', '}'];
		expect(jsonSearchMatches(lines, 'region')).toEqual([1]);
		expect(jsonSearchMatches(lines, '')).toEqual([]);
		expect(jsonSearchMatches(['a', 'a', 'a'], 'a', 2)).toEqual([0, 1]);
	});

	it('derives a safe download filename', () => {
		expect(jsonFilename('region=nsw1&metric=power&interval=5m')).toBe(
			'network-data-region-nsw1-metric-power-interval-5m.json'
		);
		expect(jsonFilename('')).toBe('network-data-entry.json');
	});
});
