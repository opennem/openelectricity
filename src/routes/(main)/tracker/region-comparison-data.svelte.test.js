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

/** @param {string[]} regions */
function harness(regions) {
	const state = $state({ selection: normaliseRegionComparison({ regions }) });
	/** @type {ReturnType<typeof createRegionComparisonData>} */
	let source;
	const stop = $effect.root(() => {
		source = createRegionComparisonData(
			() => state.selection,
			nowMs,
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
});
