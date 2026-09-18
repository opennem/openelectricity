import { afterEach, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import { createLoadingNotice } from './tracker-loading.svelte.js';

afterEach(() => vi.useRealTimers());

it('suppresses cached updates, shows sustained loading and cancels on settle or destroy', () => {
	vi.useFakeTimers();
	let pending = $state(false);
	const stop = $effect.root(() => {
		const notice = createLoadingNotice(() => pending);
		flushSync();
		pending = true;
		flushSync();
		vi.advanceTimersByTime(100);
		expect(notice.active).toBe(false);
		pending = false;
		flushSync();
		vi.advanceTimersByTime(300);
		expect(notice.active).toBe(false);
		pending = true;
		flushSync();
		vi.advanceTimersByTime(200);
		flushSync();
		expect(notice.active).toBe(true);
		pending = false;
		flushSync();
		expect(notice.active).toBe(false);
		pending = true;
		flushSync();
	});
	stop();
	expect(vi.getTimerCount()).toBe(0);
});
