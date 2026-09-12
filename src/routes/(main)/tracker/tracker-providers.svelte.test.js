import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import {
	clearCompletedResponses,
	clearInFlightFetches
} from '$lib/components/charts/v2/ChartDataManager.svelte.js';
import { createTrackerProviders } from './tracker-providers.svelte.js';
import { createTrackerSession } from './tracker-session.svelte.js';
import { parseTrackerUrl } from './tracker-url.js';
import { stubNetworkFetch } from './test-fixtures.svelte.js';

const nowMs = Date.parse('2026-09-06T00:00:00Z');

async function settle(ms = 200) {
	await vi.advanceTimersByTimeAsync(ms);
	flushSync();
}

/** @param {string} query */
function harness(query = '') {
	const session = createTrackerSession(
		{ ...parseTrackerUrl(new URLSearchParams(query), { nowMs }), nowMs },
		() => {}
	);
	const flags = $state({ contributionDemand: false, windowMetrics: false });
	/** @type {ReturnType<typeof createTrackerProviders>} */
	let providers;
	const stop = $effect.root(() => {
		providers = createTrackerProviders({
			selection: () => session.selection,
			range: session.range,
			timeZone: () => session.timeZone,
			needsContributionDemand: () => flags.contributionDemand,
			needsWindowMetrics: () => flags.windowMetrics
		});
	});
	// Registering the providers with the range control pushes the viewport to them.
	const disconnect = session.connect(() => providers.all);
	// @ts-expect-error assigned synchronously inside the root
	return { session, flags, providers, stop: () => (disconnect(), stop()) };
}

describe('tracker providers', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		clearCompletedResponses();
		clearInFlightFetches();
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	it('fetches every table feed while the panel is open and settles', async () => {
		const api = stubNetworkFetch();
		const { providers, stop } = harness();
		expect(providers.pending).toBe(true);
		await settle();
		expect([...api.metrics].sort()).toEqual(
			['curtailment', 'demand', 'emissions', 'market_value', 'renewable_share', 'renewables'].sort()
		);
		expect(providers.pending).toBe(false);
		expect(providers.error).toBeNull();
		stop();
	});

	it('fetches nothing with the table closed and no overlays, then only what an overlay needs', async () => {
		const api = stubNetworkFetch();
		const { session, providers, stop } = harness('table=0');
		await settle();
		expect(api.urls).toHaveLength(0);
		expect(providers.pending).toBe(false);
		session.select('overlays', ['demand'], null);
		await settle();
		expect(api.metrics).toEqual(['demand']);
		session.select('overlays', ['demand', 'curtailment-wind'], null);
		await settle();
		expect(api.metrics).toEqual(['demand', 'curtailment']);
		stop();
	});

	it('loads the gross-demand pair only when a percentage basis or the metrics pane needs it', async () => {
		const api = stubNetworkFetch();
		const { flags, stop } = harness('table=0');
		await settle();
		expect(api.urls).toHaveLength(0);
		flags.contributionDemand = true;
		await settle();
		expect(api.metrics).toEqual(['renewables']);
		flags.windowMetrics = true;
		await settle();
		expect([...api.metrics].sort()).toEqual(['demand', 'renewable_share', 'renewables']);
		stop();
	});

	it('serves the renewables share from the official series at native grains and retries everything', async () => {
		const api = stubNetworkFetch();
		const { providers, stop } = harness();
		await settle();
		expect(providers.renewablesSource).toBe(providers.shareData);
		const before = api.urls.length;
		providers.retry();
		await settle();
		// Reconciling a settled window fetches nothing new.
		expect(api.urls.length).toBe(before);
		stop();
	});
});
