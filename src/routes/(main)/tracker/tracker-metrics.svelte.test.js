import { describe, expect, it } from 'vitest';
import { flushSync } from 'svelte';
import { createTrackerSession } from './tracker-session.svelte.js';
import { createTrackerMetrics } from './tracker-metrics.svelte.js';
import { parseTrackerUrl } from './tracker-url.js';
import { makeProvider, makeProviders, makeSnapshot } from './test-fixtures.svelte.js';

const nowMs = Date.parse('2026-09-06T00:00:00Z');

function harness() {
	const session = createTrackerSession(
		{ ...parseTrackerUrl(new URLSearchParams(), { nowMs }), nowMs },
		() => {}
	);
	const { start, end } = session.window;
	const state = $state({
		holdFrame: false,
		charts: /** @type {Record<string, {ready: boolean, error: string | null}>} */ ({
			generation: { ready: true, error: null },
			market: { ready: true, error: null },
			emissions: { ready: true, error: null }
		})
	});
	const snapshot = makeSnapshot({ start, end, data: [{ time: start, coal: 1 }] });
	// Cast where declared: a same-named key's cast (`data: … (data)`) trips the
	// Svelte compiler's printer (sveltejs/esrap#257).
	const data = /** @type {any} */ ({
		/** @param {string} name */
		state: (name) => ({
			key: name,
			pending: !state.charts[name].ready,
			error: state.charts[name].error
		}),
		/** @param {string} name */
		ready: (name) => state.charts[name].ready && !state.charts[name].error,
		/** @param {string} name */
		current: (name) => (state.charts[name].ready ? snapshot : null)
	});
	const demandData = makeProvider({ rows: [{ time: start, demand: 5 }] });
	const shareData = makeProvider({ rows: [{ time: start, renewable_share: 40 }] });
	const providers = /** @type {any} */ (makeProviders({ demandData, shareData }));
	const table = /** @type {any} */ ({ displayRowOpts: {}, shareRowOpts: {} });
	const metrics = createTrackerMetrics({
		session,
		data,
		providers,
		table,
		hidden: () => [],
		priceMetric: () => 'price',
		holdFrame: () => state.holdFrame
	});
	return { session, state, metrics, demandData, shareData, snapshot };
}

describe('tracker metrics feed', () => {
	it('feeds accepted chart snapshots and provider rows once everything has settled', () => {
		const stop = $effect.root(() => {
			const { metrics, snapshot, demandData } = harness();
			flushSync();
			expect(metrics.status.generation).toEqual({ pending: false, error: null });
			expect(metrics.input.generation).toBe(snapshot);
			expect(metrics.input.demand?.data).toEqual(demandData.rows);
			expect(metrics.input.renewables?.seriesNames).toEqual(['renewable_share']);
		});
		stop();
	});
	it('withholds every input while a frame is held or a gesture is active', () => {
		const stop = $effect.root(() => {
			const { metrics, state, session } = harness();
			state.holdFrame = true;
			flushSync();
			expect(Object.values(metrics.status).every((entry) => entry.pending)).toBe(true);
			expect(metrics.input.generation).toBeNull();
			state.holdFrame = false;
			session.gestureActive = true;
			flushSync();
			expect(metrics.status.demand.pending).toBe(true);
		});
		stop();
	});
	it('reports failures per metric and retries only the provider-backed ones', () => {
		const stop = $effect.root(() => {
			const { metrics, state, demandData, shareData } = harness();
			state.charts.market.error = 'Upstream 503';
			demandData.error = 'Timed out';
			flushSync();
			expect(metrics.status.market).toEqual({ pending: false, error: 'Upstream 503' });
			expect(metrics.input.market).toBeNull();
			expect(metrics.status.demand).toEqual({ pending: false, error: 'Timed out' });
			metrics.retry('demand');
			metrics.retry('renewables');
			metrics.retry('market');
			expect(demandData.reconciled).toBe(1);
			expect(shareData.reconciled).toBe(1);
		});
		stop();
	});
});
