import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import {
	clearCompletedResponses,
	clearInFlightFetches
} from '$lib/components/charts/v2/ChartDataManager.svelte.js';
import { createRegionComparisonData } from './region-comparison-data.svelte.js';
import { DAILY_WINDOW_MS, normaliseRegionComparison } from './region-comparison.js';
import { failedResponse, stubNetworkFetch } from './test-fixtures.svelte.js';

const nowMs = Date.parse('2026-09-06T00:00:00Z');

async function settle(ms = 200) {
	await vi.advanceTimersByTimeAsync(ms);
	flushSync();
}

/** @param {string[]} regions @param {{interval?: string}} [overrides]
 * @param {{start: number, end: number}} [viewport] */
function harness(regions, overrides = {}, viewport = { start: 0, end: 0 }) {
	const state = $state({
		selection: normaliseRegionComparison({ regions, ...overrides }),
		viewport
	});
	/** @type {ReturnType<typeof createRegionComparisonData>} */
	let source;
	const stop = $effect.root(() => {
		source = createRegionComparisonData(
			() => state.selection,
			nowMs,
			() => ({ values: [], source: '', fetchedAt: '', reference: '' }),
			() => state.viewport
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

	it('fetches daily rows with a three-month buffer, only when the buffer moves', async () => {
		const api = stubNetworkFetch();
		const dayEnd = Date.UTC(2026, 8, 6);
		/** @param {string} interval */
		const windows = (interval) =>
			api.urls
				.map((href) => new URL(href, 'http://test').searchParams)
				.filter((params) => params.get('interval') === interval)
				.map((params) => params.get('date_start'));
		const { state, source, stop } = harness(
			['nsw1'],
			{ interval: '1d' },
			{ start: dayEnd - DAILY_WINDOW_MS, end: dayEnd }
		);
		expect(source.pending).toBe(true);
		await settle();
		expect(windows('1M')).toHaveLength(4);
		expect(windows('1d')).toEqual(Array(4).fill('2025-06-01T00:00:00'));
		expect(
			api
				.params(api.urls.length - 1)
				.get('date_end')
				?.slice(0, 7)
		).toBe('2026-09');
		expect(source.pending).toBe(false);
		// A slide inside the buffer fetches nothing, even though the pan replaces
		// the selection object as the URL state does.
		state.viewport = { start: Date.UTC(2025, 8, 20), end: Date.UTC(2026, 8, 1) };
		state.selection = normaliseRegionComparison({
			regions: ['nsw1'],
			interval: '1d',
			start: state.viewport.start,
			end: state.viewport.end
		});
		const before = source.data;
		await settle();
		expect(windows('1d')).toHaveLength(4);
		// …and leaves the joined dataset untouched, so nothing downstream recomputes.
		expect(source.data).toBe(before);
		// Moving the window back a year fetches only the months not yet cached.
		state.viewport = { start: Date.UTC(2024, 6, 1), end: Date.UTC(2025, 6, 1) };
		await settle();
		expect(windows('1d').slice(4)).toEqual(Array(4).fill('2024-04-01T00:00:00'));
		expect(
			api
				.params(api.urls.length - 1)
				.get('date_end')
				?.slice(0, 7)
		).toBe('2025-06');
		source.settle();
		await settle();
		expect(windows('1d')).toHaveLength(8);
		// The monthly set stayed warm: switching back issues no monthly request.
		state.selection = normaliseRegionComparison({ regions: ['nsw1'], interval: '12mr' });
		await settle();
		expect(windows('1M')).toHaveLength(4);
		expect(source.pending).toBe(false);
		stop();
	});
});
