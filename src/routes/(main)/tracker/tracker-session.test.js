import { describe, expect, it, vi } from 'vitest';
import { createTrackerSession } from './tracker-session.svelte.js';
import { createTrackerNavigation } from './tracker-navigation.js';
import { parseTrackerUrl } from './tracker-url.js';

const nowMs = new Date('2026-09-06T00:00:00Z').getTime();
const initial = { ...parseTrackerUrl(new URLSearchParams(), { nowMs }), nowMs };

describe('Tracker navigation', () => {
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
