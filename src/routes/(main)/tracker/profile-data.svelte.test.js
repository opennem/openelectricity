import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import {
	clearCompletedResponses,
	clearInFlightFetches
} from '$lib/components/charts/v2/ChartDataManager.svelte.js';
import { getGroup } from '$lib/components/charts/network/groups.js';
import { createProfileData } from './profile-data.svelte.js';
import { profileWindow } from './time-of-day.js';
import { failedResponse, powerResponse, stubNetworkFetch } from './test-fixtures.svelte.js';

const DAY = 86_400_000;
const nowMs = Date.parse('2026-09-06T00:00:00Z');
const zone = '+10:00';

/** Drain the request debounce and the effect queue. */
async function settle(ms = 200) {
	await vi.advanceTimersByTimeAsync(ms);
	flushSync();
}

/** @param {Partial<{days: number, enabled: boolean}>} [overrides] */
function harness(overrides = {}) {
	const state = $state({
		days: overrides.days ?? 7,
		enabled: overrides.enabled ?? true
	});
	/** @type {ReturnType<typeof createProfileData>} */
	let source;
	const stop = $effect.root(() => {
		source = createProfileData(() => ({
			region: 'nsw1',
			zone,
			group: getGroup('simple'),
			window: profileWindow(nowMs, zone, state.days),
			enabled: state.enabled
		}));
	});
	// @ts-expect-error assigned synchronously inside the root
	return { state, source, stop };
}

/** Network-local text the API expects for an epoch. @param {number} ms */
const local = (ms) => new Date(ms + 10 * 3_600_000).toISOString().slice(0, 19);

describe('profile data source', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
		clearCompletedResponses();
		clearInFlightFetches();
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	it('fetches exactly the selected complete days, once, and serves their rows', async () => {
		const window = profileWindow(nowMs, zone, 7);
		const api = stubNetworkFetch(() =>
			powerResponse(local(window.start), { coal_black: 120, wind: 80 })
		);
		const { source, stop } = harness();
		flushSync();
		expect(source.pending).toBe(true);
		await settle();
		expect(api.urls).toHaveLength(1);
		const params = api.params(0);
		expect(params.get('interval')).toBe('5m');
		expect(params.get('metric')).toBe('power');
		expect(params.get('region')).toBe('nsw1');
		expect(params.get('date_start')).toBe(local(window.start));
		expect(params.get('date_end')).toBe(local(window.end));
		expect(source.pending).toBe(false);
		expect(source.error).toBeNull();
		// Fuel techs arrive grouped: black coal folds into the Simplified 'coal' group.
		expect(source.meta?.seriesNames).toEqual(expect.arrayContaining(['coal', 'wind']));
		expect(source.rows.map((row) => row.time)).toEqual([window.start]);
		expect(source.rows[0].coal).toBe(120);
		stop();
	});

	it('widens the window by fetching only the missing earlier days', async () => {
		const api = stubNetworkFetch();
		const { state, source, stop } = harness();
		await settle();
		expect(api.urls).toHaveLength(1);
		const seven = profileWindow(nowMs, zone, 7);
		state.days = 14;
		flushSync();
		expect(source.pending).toBe(true);
		await settle();
		expect(api.urls).toHaveLength(2);
		const fourteen = profileWindow(nowMs, zone, 14);
		expect(api.params(1).get('date_start')).toBe(local(fourteen.start));
		expect(api.params(1).get('date_end')).toBe(local(seven.start));
		expect(fourteen.end - fourteen.start).toBe(14 * DAY);
		expect(source.pending).toBe(false);
		stop();
	});

	it('does not fetch while disabled and fetches its window once enabled', async () => {
		const api = stubNetworkFetch();
		const { state, source, stop } = harness({ enabled: false });
		await settle();
		expect(api.urls).toHaveLength(0);
		expect(source.pending).toBe(false);
		state.enabled = true;
		await settle();
		expect(api.metrics).toEqual(['power']);
		stop();
	});

	it('refetches its newest readings when a refresh extends today so far', async () => {
		const api = stubNetworkFetch();
		const todayStart = profileWindow(nowMs, zone, 7).todayStart;
		const today = $state({ start: todayStart, end: todayStart + 9 * 3_600_000 });
		/** @type {ReturnType<typeof createProfileData>} */
		let source;
		const stop = $effect.root(() => {
			source = createProfileData(() => ({
				region: 'nsw1',
				zone,
				group: getGroup('simple'),
				window: { start: today.start, end: today.end }
			}));
		});
		await settle();
		expect(api.urls).toHaveLength(1);
		// @ts-expect-error assigned synchronously inside the root
		source.refresh();
		const before = today.end;
		today.end = before + 3_600_000;
		await settle();
		// The last two 5-minute buckets are revisited, and the new hour fetched.
		const spans = api.urls.slice(1).map((_, i) => {
			const params = api.params(i + 1);
			return [params.get('date_start'), params.get('date_end')];
		});
		expect(spans[0][0]).toBe(local(before - 10 * 60_000));
		expect(spans.at(-1)?.[1]).toBe(local(today.end));
		stop();
	});

	it('revisits its newest readings on refresh when the window stays put', async () => {
		const api = stubNetworkFetch();
		const { source, stop } = harness();
		await settle();
		expect(api.urls).toHaveLength(1);
		source.refresh();
		await settle();
		expect(api.urls).toHaveLength(2);
		const window = profileWindow(nowMs, zone, 7);
		expect(api.params(1).get('date_start')).toBe(local(window.end - 10 * 60_000));
		expect(api.params(1).get('date_end')).toBe(local(window.end));
		stop();
	});

	it('reports a failed request and retries it on demand', async () => {
		let fail = true;
		const api = stubNetworkFetch(() =>
			fail ? failedResponse(503, 'Fixture failure') : { data: [] }
		);
		const { source, stop } = harness();
		// The shared fetch helper retries a 503 once after its backoff.
		await settle(1200);
		expect(api.urls).toHaveLength(2);
		expect(source.error).toBe('Data request failed (503): Fixture failure');
		expect(source.pending).toBe(false);
		fail = false;
		source.retry();
		await settle();
		expect(api.urls).toHaveLength(3);
		expect(source.error).toBeNull();
		stop();
	});
});
