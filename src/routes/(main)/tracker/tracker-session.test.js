import { describe, expect, it, vi } from 'vitest';
import { createTrackerSession } from './tracker-session.svelte.js';
import { createTrackerNavigation } from './tracker-navigation.js';
import { parseTrackerUrl } from './tracker-url.js';

const nowMs = new Date('2026-09-06T00:00:00Z').getTime();
const initial = { ...parseTrackerUrl(new URLSearchParams(), { nowMs }), nowMs };

describe('reanchor', () => {
	it('moves the clock and anchor to now, never backwards, without history', () => {
		const changed = vi.fn();
		const session = createTrackerSession(initial, changed);
		const later = nowMs + 26 * 3_600_000;
		session.reanchor(later);
		expect(session.anchorEnd).toBe(later);
		expect(session.clockMs).toBe(later);
		session.reanchor(nowMs);
		expect(session.anchorEnd).toBe(later);
		expect(changed).not.toHaveBeenCalled();
	});
});

describe('Tracker navigation', () => {
	it('restores full history without writing', () => {
		const changed = vi.fn();
		const session = createTrackerSession(initial, changed);
		session.connect(() => []);
		const previous = session.selection;
		session.select('region', 'wem');
		session.select('profileDays', 28);
		changed.mockClear();
		session.restore(previous);
		expect(session.selection).toEqual(previous);
		expect(changed).not.toHaveBeenCalled();
	});
	it('writes within its own route and ignores other routes and its own writes', () => {
		let url = new URL('https://example.com/tracker/timeline?region=wem&range=30d&unknown=1');
		const previous = new URL(url);
		const navigation = createTrackerNavigation({
			read: () => new URL(url),
			write: (next) => {
				url = next;
			}
		});
		const session = createTrackerSession(
			{ ...parseTrackerUrl(url.searchParams, { nowMs }), nowMs },
			(mode) => navigation.write(session.selection, mode)
		);
		session.select('region', 'nsw1');
		expect(url.pathname).toBe('/tracker/timeline');
		expect(url.searchParams.get('region')).toBe('nsw1');
		expect(navigation.read(url, nowMs)).toBeNull();
		expect(navigation.read(new URL('https://example.com/tracker/compare'), nowMs)).toBeNull();
		const restored = navigation.read(previous, nowMs);
		expect(restored?.region).toBe('wem');
		if (restored) session.restore(restored);
		expect(session.selection.range).toMatchObject({ kind: 'preset', days: 30 });
	});
	it('restores an address bar that is ahead of the loaded page URL', () => {
		// Back onto another route's shallow entry loads its base URL only.
		const address = new URL('https://example.com/tracker/profile?profile-days=28');
		const navigation = createTrackerNavigation(
			{ read: () => new URL(address), write: () => {} },
			new URL('https://example.com/tracker/profile')
		);
		expect(navigation.read(address, nowMs)?.profileDays).toBe(28);
		expect(navigation.read(address, nowMs)).toBeNull();
	});
	it('advances live presets without history, preserves span and pauses exact bounds', async () => {
		const changed = vi.fn();
		const session = createTrackerSession(initial, changed);
		const chart = { setViewport: vi.fn() };
		const disconnect = session.connect(() => [chart]);
		await Promise.resolve();
		const original = { ...session.window };
		session.refresh(nowMs + 60_000);
		expect(session.window).toEqual({ start: original.start + 60_000, end: original.end + 60_000 });
		expect(changed).not.toHaveBeenCalled();
		expect(session.following).toBe(true);
		await Promise.resolve();
		session.settleViewport({ start: session.window.start, end: session.window.end - 30_000 });
		const paused = { ...session.window };
		expect(session.following).toBe(false);
		expect(session.selection.range).toMatchObject({
			kind: 'custom',
			startMs: paused.start,
			endMs: paused.end
		});
		session.refresh(nowMs + 600_000);
		expect(session.window).toEqual(paused);
		const clock = vi.spyOn(Date, 'now').mockReturnValue(nowMs + 600_000);
		session.selectRange(3);
		clock.mockRestore();
		expect(session.following).toBe(true);
		expect(session.window.end).toBe(nowMs + 600_000);
		expect(changed.mock.calls).toEqual([['replace'], ['push']]);
		disconnect();
		session.refresh(nowMs + 700_000);
		expect(session.window.end).toBe(nowMs + 600_000);
	});
	it('does not advance busy or gesturing charts; All keeps its floor', () => {
		const session = createTrackerSession(initial, () => {});
		session.connect(() => []);
		session.refresh(nowMs + 60_000, { ready: false });
		expect(session.window.end).toBe(nowMs);
		session.gestureActive = true;
		session.refresh(nowMs + 60_000);
		expect(session.window.end).toBe(nowMs);
		session.gestureActive = false;
		vi.useFakeTimers();
		vi.setSystemTime(nowMs);
		session.selectRange(-1);
		session.refresh(nowMs + 60_000);
		expect(session.window).toEqual({ start: Date.UTC(1998, 11, 1), end: nowMs + 60_000 });
		vi.useRealTimers();
	});
	it('restores exact comparison dates without changing the timeline or emitting history', () => {
		const changed = vi.fn();
		const session = createTrackerSession(initial, changed);
		const applyRange = vi.spyOn(session.range, 'handleRangeSelect');
		const comparison = { a: nowMs - 86_400_000, b: nowMs - 1_800_000 };
		session.select('comparison', comparison);
		const selected = session.selection;
		expect(changed).toHaveBeenCalledWith('push');
		session.select('comparison', null);
		changed.mockClear();
		session.restore(selected);
		expect(session.selection.comparison).toEqual(comparison);
		expect(changed).not.toHaveBeenCalled();
		expect(applyRange).not.toHaveBeenCalled();
	});
	it('restores profile selections without changing the timeline and normalises scope switches', () => {
		const changed = vi.fn();
		const session = createTrackerSession(initial, changed);
		const before = session.selection.range;
		const applyRange = vi.spyOn(session.range, 'handleRangeSelect');
		session.select('profileDays', 28);
		session.select('profileEnd', '2026-08-31');
		const selected = session.selection;
		session.select('region', 'au');
		session.select('group', 'rvf');
		changed.mockClear();
		session.restore(selected);
		expect(session.selection).toMatchObject({
			profileDays: 28,
			profileEnd: '2026-08-31',
			range: before
		});
		expect(changed).not.toHaveBeenCalled();
		// Restoring a different region legitimately reapplies the range once.
		expect(applyRange).toHaveBeenCalledTimes(1);
	});
	it('pushes analytical changes and restores them without emitting or reapplying the range', () => {
		const changed = vi.fn();
		const session = createTrackerSession(initial, changed);
		const applyRange = vi.spyOn(session.range, 'handleRangeSelect');
		session.select('contributionMode', 'generation');
		session.select('generationTransform', 'proportion');
		session.select('marketValueTransform', 'changeSince');
		session.selectVisibility(['wind', 'coal', 'invalid'], ['demand']);
		const selected = session.selection;
		expect(changed.mock.calls).toEqual([['push'], ['push'], ['push'], ['push']]);
		expect(selected.hiddenSeries).toEqual(['coal', 'wind']);
		changed.mockClear();
		session.restore(initial);
		expect(session.selection).toMatchObject({
			hiddenSeries: [],
			contributionMode: 'demand',
			generationTransform: 'absolute',
			marketValueTransform: 'absolute'
		});
		session.restore(selected);
		expect(session.selection).toEqual(selected);
		expect(changed).not.toHaveBeenCalled();
		expect(applyRange).not.toHaveBeenCalled();
	});

	it('clears hidden IDs on grouping changes but restores them together on Back', () => {
		const session = createTrackerSession(initial, () => {});
		session.selectVisibility(['coal']);
		const before = session.selection;
		session.select('group', 'detailed');
		expect(session.selection.hiddenSeries).toEqual([]);
		session.restore(before);
		expect(session.selection).toMatchObject({ group: 'simple', hiddenSeries: ['coal'] });
		session.select('region', 'wem');
		expect(session.selection.hiddenSeries).toEqual(['coal']);
	});

	it('records solo and restore-all as single atomic entries', () => {
		/** @type {import('./types.js').TrackerUrlState[]} */
		const selections = [];
		const session = createTrackerSession(initial, () => selections.push(session.selection));
		session.selectVisibility(['coal', 'wind'], ['demand']);
		session.selectVisibility([], []);
		expect(selections).toHaveLength(2);
		expect(selections[0]).toMatchObject({ hiddenSeries: ['coal', 'wind'], overlays: ['demand'] });
		expect(selections[1]).toMatchObject({ hiddenSeries: [], overlays: [] });
	});

	it('uses the chart data floor for All even when its whole-day seed is earlier', () => {
		const session = createTrackerSession({ ...initial, nowMs: nowMs + 12_345 }, () => {});
		session.selectRange(-1);
		expect(session.window.start).toBe(Date.UTC(1998, 11, 1));
		expect(session.selection.range).toMatchObject({ kind: 'preset', days: -1 });
	});

	it('pushes explicit range choices, replaces gestures and never writes during restore', () => {
		const changed = vi.fn();
		const session = createTrackerSession(initial, changed);
		session.selectRange(30);
		expect(session.selection.range).toMatchObject({ kind: 'preset', days: 30 });
		expect(changed).toHaveBeenLastCalledWith('push');
		session.selectInterval('1d');
		expect(changed).toHaveBeenLastCalledWith('push');
		const moved = { start: nowMs - 20 * 86_400_000, end: nowMs - 86_400_000 };
		return Promise.resolve().then(() => {
			session.moveViewport(moved, null);
			session.settleViewport(moved);
			expect(session.following).toBe(false);
			session.refresh(nowMs + 86_400_000);
			expect(session.window).toEqual(moved);
			expect(session.selection.range).toMatchObject({
				kind: 'custom',
				startMs: moved.start,
				endMs: moved.end
			});
			expect(changed).toHaveBeenLastCalledWith('replace');
			changed.mockClear();
			session.restore(initial);
			expect(changed).not.toHaveBeenCalled();
			expect(session.selection.range).toEqual(initial.range);
		});
	});

	it('reads external same-route navigation but ignores its own shallow writes', () => {
		let url = new URL('https://example.com/tracker/timeline');
		const write = vi.fn((next) => {
			url = next;
		});
		const navigation = createTrackerNavigation({ read: () => new URL(url), write });
		navigation.write({ ...initial, region: 'wem' }, 'push');
		expect(navigation.read(url, nowMs)).toBeNull();
		expect(
			navigation.read(new URL('https://example.com/tracker/timeline?range=30d'), nowMs)?.range
		).toMatchObject({ days: 30 });
		expect(write).toHaveBeenCalledTimes(1);
	});
});
