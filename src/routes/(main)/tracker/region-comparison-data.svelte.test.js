import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import {
	clearCompletedResponses,
	clearInFlightFetches
} from '$lib/components/charts/v2/ChartDataManager.svelte.js';
import { createRegionComparisonData } from './region-comparison-data.svelte.js';
import { normaliseRegionComparison } from './region-comparison.js';
import { failedResponse, stubNetworkFetch } from './test-fixtures.svelte.js';

const nowMs = Date.parse('2026-09-06T00:00:00Z');

async function settle(ms = 200) {
	await vi.advanceTimersByTimeAsync(ms);
	flushSync();
}

/** @param {string[]} regions @param {{interval?: string}} [overrides] */
function harness(regions, overrides = {}) {
	const state = $state({
		selection: normaliseRegionComparison({ regions, ...overrides }),
		now: nowMs
	});
	/** @type {ReturnType<typeof createRegionComparisonData>} */
	let source;
	const stop = $effect.root(() => {
		source = createRegionComparisonData(
			() => state.selection,
			() => state.now,
			() => ({ values: [], source: '', fetchedAt: '', reference: '' })
		);
	});
	// @ts-expect-error assigned synchronously inside the root
	return { state, source, stop };
}

/** @param {string[]} urls */
const byRegion = (urls) =>
	urls.reduce((/** @type {Record<string, string[]>} */ acc, href) => {
		const params = new URL(href, 'http://test').searchParams;
		(acc[params.get('region') ?? ''] ??= []).push(params.get('metric') ?? '');
		return acc;
	}, {});

describe('region comparison data', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		clearCompletedResponses();
		clearInFlightFetches();
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	it('fetches the four monthly components for a selected region and nothing for the others', async () => {
		const api = stubNetworkFetch();
		const { source, stop } = harness(['nsw1']);
		expect(source.pending).toBe(true);
		await settle();
		const requests = byRegion(api.urls);
		expect(Object.keys(requests)).toEqual(['nsw1']);
		expect(requests.nsw1.sort()).toEqual(
			['emissions_intensity', 'flows_energy', 'price_vw', 'renewables_energy'].sort()
		);
		expect(source.pending).toBe(false);
		expect(source.status.nsw1).toEqual({ pending: false, error: null });
		stop();
	});

	it('activates both networks behind the combined scope, without flows for closed networks', async () => {
		const api = stubNetworkFetch();
		const { source, stop } = harness(['au']);
		await settle();
		const requests = byRegion(api.urls);
		expect(Object.keys(requests).sort()).toEqual(['_all', 'wem']);
		expect(requests._all).not.toContain('flows_energy');
		expect(requests.wem).not.toContain('flows_energy');
		expect(source.status.au).toEqual({ pending: false, error: null });
		stop();
	});

	it('rolls a failed network up into the combined scope and retries it by scope', async () => {
		let fail = true;
		const api = stubNetworkFetch((params) =>
			fail && params.get('region') === 'wem' && params.get('metric') === 'price_vw'
				? failedResponse(400, 'Bad request')
				: { data: [] }
		);
		const { source, stop } = harness(['au']);
		await settle();
		expect(source.status.wem.error).toBe('Data request failed (400): Bad request');
		expect(source.status.au.error).toBe('Data request failed (400): Bad request');
		expect(source.pending).toBe(false);
		fail = false;
		const before = api.urls.length;
		source.retry('au');
		await settle();
		expect(api.urls.length).toBeGreaterThan(before);
		expect(source.status.au).toEqual({ pending: false, error: null });
		stop();
	});

	it('serves every interval and filter from the warm monthly cache', async () => {
		const api = stubNetworkFetch();
		const { state, source, stop } = harness(['nsw1']);
		await settle();
		const requests = api.urls.length;
		expect(requests).toBe(4);
		// A pan replaces the selection object, as the URL state does, but leaves
		// the joined dataset untouched, so nothing downstream recomputes.
		const before = source.data;
		state.selection = normaliseRegionComparison({
			regions: ['nsw1'],
			start: Date.UTC(2020, 0),
			end: Date.UTC(2024, 0)
		});
		await settle();
		expect(source.data).toBe(before);
		/** @type {Array<[string, string | null]>} */
		const choices = [
			['season', 'winter'],
			['12mr-quarter', null],
			['fy', null]
		];
		for (const [interval, filter] of choices) {
			state.selection = normaliseRegionComparison({ regions: ['nsw1'], interval, filter });
			await settle();
		}
		expect(api.urls).toHaveLength(requests);
		expect(source.pending).toBe(false);
		stop();
	});

	it('refreshes the shown regions’ two newest complete months past caches', async () => {
		const api = stubNetworkFetch();
		const { state, source, stop } = harness(['nsw1']);
		await settle();
		expect(api.urls).toHaveLength(4);
		source.refresh();
		await settle();
		const refreshed = api.urls.slice(4).map((href) => new URL(href, 'http://test').searchParams);
		expect(Object.keys(byRegion(api.urls.slice(4)))).toEqual(['nsw1']);
		// 6 September: August is the newest complete month, July the one before.
		expect(refreshed.map((params) => params.get('date_start'))).toEqual(
			Array(4).fill('2026-07-01T00:00:00')
		);
		// A new month joins the bounds once now moves past it.
		state.now = Date.parse('2026-10-02T00:00:00Z');
		flushSync();
		expect(source.bounds.end).toBe(Date.UTC(2026, 9, 1));
		stop();
	});

	it('keeps the months on screen while a refresh fetches the newest again', async () => {
		/** Monthly energy and emissions for coal from January 2026. */
		const energy = () => ({
			data: ['emissions', 'energy'].map((metric) => ({
				metric,
				results: [
					{
						columns: { fueltech: 'coal_black' },
						data: [
							['2026-01-01T00:00:00+10:00', metric === 'emissions' ? 900 : 1000],
							['2026-02-01T00:00:00+10:00', metric === 'emissions' ? 900 : 1000]
						]
					}
				]
			}))
		});
		stubNetworkFetch((params) =>
			params.get('metric') === 'emissions_intensity' ? energy() : { data: [] }
		);
		const { source, stop } = harness(['nsw1'], { interval: '1M' });
		await settle();
		const loaded = source.data.nsw1?.length ?? 0;
		expect(loaded).toBeGreaterThan(0);
		source.refresh();
		flushSync();
		expect(source.pending).toBe(true);
		expect(source.data.nsw1?.length).toBe(loaded);
		await settle();
		expect(source.pending).toBe(false);
		stop();
	});
});
