import { describe, expect, it } from 'vitest';
import { flushSync } from 'svelte';
import { createTrackerSession } from './tracker-session.svelte.js';
import { createTrackerTable } from './tracker-table.svelte.js';
import { parseTrackerUrl } from './tracker-url.js';
import { makeProvider, makeProviders, makeSnapshot } from './test-fixtures.svelte.js';

const nowMs = Date.parse('2026-09-06T00:00:00Z');

/** Everything the table owner needs, with settable readiness. */
function harness() {
	const session = createTrackerSession(
		{ ...parseTrackerUrl(new URLSearchParams(), { nowMs }), nowMs },
		() => {}
	);
	const { start, end } = session.window;
	const marketData = makeProvider();
	const providers = makeProviders({ marketData });
	const state = $state({
		ready: true,
		hidden: /** @type {string[]} */ ([]),
		snapshot: makeSnapshot({
			queryKey: 'q1',
			start,
			end,
			data: [
				{ time: start, coal: 100, pumps: -10 },
				{ time: end, coal: 120, pumps: -20 }
			],
			nativeData: [
				{ time: start, coal: 100, pumps: -10 },
				{ time: end, coal: 120, pumps: -20 }
			],
			seriesNames: ['pumps', 'coal'],
			seriesLabels: { coal: 'Coal', pumps: 'Pumps' },
			seriesColours: {}
		})
	});
	const table = createTrackerTable({
		session,
		providers: /** @type {any} */ (providers),
		generation: () => state.snapshot,
		queryKey: () => state.snapshot.queryKey,
		ready: () => state.ready,
		hidden: () => state.hidden,
		contribution: () => session.selection.contributionMode,
		ianaTimeZone: () => session.ianaTimeZone
	});
	return { session, state, table, marketData };
}

describe('tracker table owner', () => {
	it('derives rows top-down, filing negative readings under loads', () => {
		const stop = $effect.root(() => {
			const { table } = harness();
			flushSync();
			expect(table.rows?.map((row) => [row.id, row.isLoad])).toEqual([
				['coal', false],
				['pumps', true]
			]);
			expect(table.rowIds).toEqual(['coal', 'pumps']);
		});
		stop();
	});
	it('accepts a complete table once and holds it while the next one is pending', () => {
		const stop = $effect.root(() => {
			const { state, table, marketData } = harness();
			flushSync();
			expect(table.valuesPending).toBe(false);
			expect(table.accepted?.rows.map((row) => row.id)).toEqual(['coal', 'pumps']);
			const held = table.accepted;
			// A provider refetch: the accepted table stays on screen, flagged pending.
			marketData.isPending = true;
			flushSync();
			expect(table.valuesPending).toBe(true);
			expect(table.accepted).toBe(held);
			marketData.isPending = false;
			flushSync();
			expect(table.valuesPending).toBe(false);
			// A new query: still the old table until its own values settle.
			state.ready = false;
			state.snapshot = { ...state.snapshot, queryKey: 'q2' };
			flushSync();
			expect(table.valuesPending).toBe(true);
			expect(table.accepted?.key).toContain('q1');
			state.ready = true;
			flushSync();
			expect(table.valuesPending).toBe(false);
			expect(table.accepted?.key).toContain('q2');
		});
		stop();
	});
	it('keeps visibility responsive on the held rows', () => {
		const stop = $effect.root(() => {
			const { state, table } = harness();
			flushSync();
			expect(table.displayedRows?.map((row) => row.hidden)).toEqual([false, false]);
			state.hidden = ['coal'];
			flushSync();
			expect(table.displayedRows?.map((row) => row.hidden)).toEqual([true, false]);
		});
		stop();
	});
});
