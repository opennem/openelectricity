import { describe, expect, it, vi } from 'vitest';
import { createTrackerSession } from './tracker-session.svelte.js';
import { createTrackerNavigation } from './tracker-navigation.js';
import { parseTrackerUrl } from './tracker-url.js';

const nowMs = new Date('2026-09-06T00:00:00Z').getTime();
const initial = { ...parseTrackerUrl(new URLSearchParams(), { nowMs }), nowMs };

describe('Tracker navigation', () => {
	it('advances live presets without history, preserves span and pauses exact bounds', async () => {
		const changed = vi.fn();
		const session = createTrackerSession(initial, changed);
		const chart = { setViewport: vi.fn() };
		const disconnect = session.connect(() => [chart]);
		await Promise.resolve();
		const original = { ...session.window };
		session.tick(nowMs + 60_000);
		expect(session.window).toEqual({ start: original.start + 60_000, end: original.end + 60_000 });
		expect(changed).not.toHaveBeenCalled();
		expect(session.following).toBe(true);
		session.pauseLive();
		const paused = { ...session.window };
		expect(session.following).toBe(false);
		expect(session.selection.range).toMatchObject({
			kind: 'custom',
			startMs: paused.start,
			endMs: paused.end
		});
		session.tick(nowMs + 600_000);
		expect(session.window).toEqual(paused);
		session.goNow(nowMs + 600_000);
		expect(session.following).toBe(true);
		expect(session.window.end).toBe(nowMs + 600_000);
		expect(changed.mock.calls).toEqual([['push'], ['push']]);
		disconnect();
		session.tick(nowMs + 700_000);
		expect(session.window.end).toBe(nowMs + 600_000);
	});
	it('does not advance busy, gesturing or time-of-day charts; All keeps its floor', () => {
		const session = createTrackerSession(initial, () => {});
		session.connect(() => []);
		session.tick(nowMs + 60_000, false);
		expect(session.window.end).toBe(nowMs);
		session.gestureActive = true;
		session.tick(nowMs + 60_000);
		expect(session.window.end).toBe(nowMs);
		session.gestureActive = false;
		session.select('profileView', 'average');
		session.tick(nowMs + 60_000);
		expect(session.window.end).toBe(nowMs);
		session.select('profileView', 'timeline');
		session.goNow(nowMs);
		vi.useFakeTimers();
		vi.setSystemTime(nowMs);
		session.selectRange(-1);
		session.tick(nowMs + 60_000);
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
		session.select('profileView', 'daily');
		session.select('profileDays', 28);
		session.select('profileMetric', 'price');
		session.select('profileSeries', 'wind');
		const selected = session.selection;
		session.select('region', 'au');
		expect(session.selection.profileMetric).toBe('power');
		session.select('group', 'rvf');
		expect(session.selection.profileSeries).toBe('');
		changed.mockClear();
		session.restore(selected);
		expect(session.selection).toMatchObject({
			profileView: 'daily',
			profileDays: 28,
			profileMetric: 'price',
			profileSeries: 'wind',
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
		session.select('contributionMode', 'demand');
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
			contributionMode: 'generation',
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
			session.tick(nowMs + 86_400_000);
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
		let url = new URL('https://example.com/tracker');
		const write = vi.fn((next) => {
			url = next;
		});
		const navigation = createTrackerNavigation({ read: () => url, write });
		navigation.write({ ...initial, region: 'wem' }, 'push');
		expect(navigation.read(url, nowMs)).toBeNull();
		expect(
			navigation.read(new URL('https://example.com/tracker?range=30d'), nowMs)?.range
		).toMatchObject({ days: 30 });
		expect(write).toHaveBeenCalledTimes(1);
	});
});
