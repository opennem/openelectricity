import { describe, it, expect, vi } from 'vitest';
import { createIdlePrefetcher } from './idle-prefetch.js';

/** Manual idle queue — `flush()` runs one scheduled slice. */
function manualScheduler() {
	/** @type {Array<{ id: number, cb: () => void }>} */
	let pending = [];
	let nextId = 1;
	return {
		scheduleIdle: (/** @type {() => void} */ cb) => {
			const id = nextId++;
			pending.push({ id, cb });
			return id;
		},
		cancelIdle: (/** @type {number} */ id) => {
			pending = pending.filter((p) => p.id !== id);
		},
		flush() {
			const next = pending.shift();
			next?.cb();
			return !!next;
		},
		get pendingCount() {
			return pending.length;
		}
	};
}

describe('createIdlePrefetcher', () => {
	it('runs one job per idle slice, in order', () => {
		const sched = manualScheduler();
		const ran = /** @type {string[]} */ ([]);
		const prefetcher = createIdlePrefetcher(sched);

		prefetcher.setPlan([
			{ key: 'a', run: () => ran.push('a') },
			{ key: 'b', run: () => ran.push('b') }
		]);
		prefetcher.kick();

		expect(ran).toEqual([]);
		sched.flush();
		expect(ran).toEqual(['a']);
		sched.flush();
		expect(ran).toEqual(['a', 'b']);
		expect(sched.pendingCount).toBe(0);
	});

	it('skips slices while paused without consuming jobs', () => {
		const sched = manualScheduler();
		let isPaused = true;
		const ran = /** @type {string[]} */ ([]);
		const prefetcher = createIdlePrefetcher({ ...sched, paused: () => isPaused });

		prefetcher.setPlan([{ key: 'a', run: () => ran.push('a') }]);
		prefetcher.kick();

		sched.flush();
		expect(ran).toEqual([]);
		sched.flush();
		expect(ran).toEqual([]);

		isPaused = false;
		sched.flush();
		expect(ran).toEqual(['a']);
	});

	it('never re-runs a key, even across plan updates', () => {
		const sched = manualScheduler();
		const run = vi.fn();
		const prefetcher = createIdlePrefetcher(sched);

		prefetcher.setPlan([{ key: 'a', run }]);
		prefetcher.kick();
		sched.flush();
		expect(run).toHaveBeenCalledTimes(1);

		prefetcher.setPlan([
			{ key: 'a', run },
			{ key: 'b', run }
		]);
		prefetcher.kick();
		sched.flush();
		sched.flush();
		expect(run).toHaveBeenCalledTimes(2); // Only b is new.
	});

	it('a new plan supersedes queued-but-unrun jobs', () => {
		const sched = manualScheduler();
		const ran = /** @type {string[]} */ ([]);
		const prefetcher = createIdlePrefetcher(sched);

		prefetcher.setPlan([{ key: 'stale', run: () => ran.push('stale') }]);
		prefetcher.kick();
		prefetcher.setPlan([{ key: 'fresh', run: () => ran.push('fresh') }]);
		prefetcher.kick();

		while (sched.flush()) {
			// Run all scheduled work.
		}
		expect(ran).toEqual(['fresh']);
	});

	it('reset clears queued and completed jobs for a new manager', () => {
		const sched = manualScheduler();
		const run = vi.fn();
		const prefetcher = createIdlePrefetcher(sched);

		prefetcher.setPlan([{ key: 'a', run }]);
		prefetcher.kick();
		sched.flush();
		expect(run).toHaveBeenCalledTimes(1);

		prefetcher.setPlan([{ key: 'stale', run }]);
		prefetcher.kick();
		prefetcher.reset();
		expect(sched.pendingCount).toBe(0);

		prefetcher.setPlan([{ key: 'a', run }]);
		prefetcher.kick();
		sched.flush();
		expect(run).toHaveBeenCalledTimes(2);
	});

	it('a failing job never blocks the rest', () => {
		const sched = manualScheduler();
		const ran = /** @type {string[]} */ ([]);
		const prefetcher = createIdlePrefetcher(sched);

		prefetcher.setPlan([
			{
				key: 'boom',
				run: () => {
					throw new Error('boom');
				}
			},
			{ key: 'after', run: () => ran.push('after') }
		]);
		prefetcher.kick();
		sched.flush();
		sched.flush();
		expect(ran).toEqual(['after']);
	});

	it('stop() cancels outstanding scheduling and drops the queue', () => {
		const sched = manualScheduler();
		const run = vi.fn();
		const prefetcher = createIdlePrefetcher(sched);

		prefetcher.setPlan([{ key: 'a', run }]);
		prefetcher.kick();
		prefetcher.stop();

		expect(sched.pendingCount).toBe(0);
		sched.flush();
		expect(run).not.toHaveBeenCalled();

		// stop() is permanent.
		prefetcher.setPlan([{ key: 'b', run }]);
		prefetcher.kick();
		expect(sched.pendingCount).toBe(0);
	});
});
