import { describe, expect, it } from 'vitest';
import { flushSync } from 'svelte';
import { createTrackerSession } from './tracker-session.svelte.js';
import { createTrackerTable } from './tracker-table.svelte.js';
import { parseTrackerUrl } from './tracker-url.js';
import { makeProvider, makeProviders, makeSnapshot } from './test-fixtures.svelte.js';

const nowMs = Date.parse('2026-09-06T00:00:00Z');

/** Everything the table owner needs, with settable readiness.
 * @param {string} [search] - Tracker URL query */
function harness(search = '') {
	const session = createTrackerSession(
		{ ...parseTrackerUrl(new URLSearchParams(search), { nowMs }), nowMs },
		() => {}
	);
	const { start, end } = session.window;
	const marketData = makeProvider();
	const intensityData = makeProvider();
	const providers = makeProviders({ marketData, intensityData });
	const state = $state({
		ready: true,
		inspectTime: /** @type {number | undefined} */ (undefined),
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
		inspectTime: () => state.inspectTime,
		ianaTimeZone: () => session.ianaTimeZone
	});
	return { session, state, table, marketData, intensityData, providers };
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
	it('never waits on or reports the metrics strip’s intensity feed', () => {
		const stop = $effect.root(() => {
			const { table, intensityData, marketData } = harness();
			intensityData.isPending = true;
			intensityData.error = 'Intensity failed';
			flushSync();
			expect(table.valuesPending).toBe(false);
			expect(table.feedsError).toBeNull();
			expect(table.accepted?.rows.map((row) => row.id)).toEqual(['coal', 'pumps']);
			// Its own feeds still hold it, and report their failure.
			marketData.error = 'Market failed';
			flushSync();
			expect(table.valuesPending).toBe(true);
			expect(table.feedsError).toBe('Market failed');
			table.retryFeeds();
			expect(marketData.reconciled).toBe(1);
			expect(intensityData.reconciled).toBe(0);
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

describe('window durations', () => {
	// A constant 100 MW: 74,400 MWh in a 31-day month, 67,200 MWh in February.
	it.each([
		['unequal months', 'range=1y', ['2024-12-31T14:00:00Z', '2025-01-31T14:00:00Z']],
		[
			'a calendar filter',
			'range=all&interval=1M&filter=jan',
			['2023-12-31T14:00:00Z', '2024-12-31T14:00:00Z']
		]
	])('averages power over native month lengths with %s', (_, search, months) => {
		const stop = $effect.root(() => {
			const { state, table, session } = harness(search);
			expect(session.range.activeInterval).toBe('1M');
			const nativeData = months.map((iso) => {
				const time = Date.parse(iso);
				const days = new Date(time + 10 * 3_600_000).getUTCMonth() === 1 ? 28 : 31;
				return { time, coal: 100 * 24 * days, pumps: 0 };
			});
			state.snapshot = { ...state.snapshot, data: nativeData, nativeData };
			flushSync();
			expect(table.rows?.find((row) => row.id === 'coal')?.avPowerMW).toBeCloseTo(100);
		});
		stop();
	});
});

describe('the month in progress', () => {
	// nowMs is 6 September 10:00 AEST: September has run 130 hours of its 720.
	const august = Date.parse('2026-07-31T14:00:00Z');
	const september = Date.parse('2026-08-31T14:00:00Z');
	const elapsed = (nowMs - september) / 3_600_000;
	/** A constant 100 MW through a complete August and September so far. */
	function openMonth() {
		const harnessed = harness('range=1y');
		const nativeData = [
			{ time: august, coal: 100 * 744, pumps: 0 },
			{ time: september, coal: 100 * elapsed, pumps: 0 }
		];
		harnessed.state.snapshot = { ...harnessed.state.snapshot, data: nativeData, nativeData };
		flushSync();
		return harnessed;
	}

	it('counts only its elapsed hours in the window average', () => {
		const stop = $effect.root(() => {
			const { table } = openMonth();
			expect(elapsed).toBe(130);
			const coal = table.rows?.find((row) => row.id === 'coal');
			expect(coal?.energyMWh).toBe(100 * (744 + 130));
			expect(coal?.avPowerMW).toBeCloseTo(100);
		});
		stop();
	});

	it('averages over its elapsed hours when inspected', () => {
		const stop = $effect.root(() => {
			const { state, table } = openMonth();
			state.inspectTime = september;
			flushSync();
			expect(table.inspection?.rows.find((row) => row.id === 'coal')?.avPowerMW).toBeCloseTo(100);
			state.inspectTime = august;
			flushSync();
			expect(table.inspection?.rows.find((row) => row.id === 'coal')?.avPowerMW).toBeCloseTo(100);
		});
		stop();
	});
});

describe('rolling renewables share', () => {
	it('inspects the share line’s own rolling ratio, not the month’s official share', () => {
		const stop = $effect.root(() => {
			const { state, table, session, providers } = harness('range=1y&interval=12mr');
			expect(session.range.displayInterval).toBe('12mr');
			const time = session.window.start;
			// The month alone read 60%; its trailing 12 months, 32.5%.
			providers.shareData.rows = [{ time, renewable_share: 60 }];
			providers.renewableShareRows = () => [{ time, renewable_share: 32.5 }];
			state.inspectTime = time;
			flushSync();
			expect(table.inspection?.overlaySummary.renewablesSharePct).toBe(32.5);
		});
		stop();
	});
});

describe('table inspection', () => {
	it('samples the shared time without changing accepted totals, and clears on exit or loading', () => {
		const stop = $effect.root(() => {
			const { state, table, marketData, session } = harness();
			flushSync();
			const totals = table.accepted;
			const time = session.window.start;
			marketData.rows = [{ time, demand_gross: 200 }];
			state.inspectTime = time;
			flushSync();
			expect(table.inspection?.rows[0]).toMatchObject({
				avPowerMW: 100,
				energyMWh: 50,
				contributionPct: 50
			});
			expect(table.inspection?.rows[1]).toMatchObject({
				avPowerMW: 10,
				energyMWh: 5,
				isLoad: true
			});
			expect(table.inspection?.rows[0].vwPrice).toBeNull();
			expect(table.displayedRows?.[0].avPowerMW).toBe(110);
			const accepted = table.accepted;
			state.inspectTime = session.window.end;
			flushSync();
			expect(table.inspection?.rows[0].avPowerMW).toBe(120);
			expect(table.inspection?.rows[0].contributionPct).toBeNull();
			expect(table.accepted).toBe(accepted);
			state.inspectTime = time + 1;
			flushSync();
			expect(table.inspection?.rows[0].avPowerMW).toBeNull();
			state.inspectTime = undefined;
			flushSync();
			expect(table.inspection).toBeNull();
			state.inspectTime = time;
			marketData.isPending = true;
			flushSync();
			expect(table.inspection).toBeNull();
			expect(totals?.rows[0].avPowerMW).toBe(110);
		});
		stop();
	});
});
