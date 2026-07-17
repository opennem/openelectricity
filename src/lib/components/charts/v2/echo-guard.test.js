import { describe, it, expect } from 'vitest';
import { createEchoGuard } from './echo-guard.js';

const microtask = () => new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

describe('createEchoGuard', () => {
	it('suppresses synchronously during run and releases on a microtask', async () => {
		const guard = createEchoGuard();
		expect(guard.suppressed).toBe(false);

		let during = false;
		guard.run(() => {
			during = guard.suppressed;
		});
		expect(during).toBe(true);
		// Still raised for the synchronous echo that follows the push
		expect(guard.suppressed).toBe(true);

		await microtask();
		expect(guard.suppressed).toBe(false);
	});

	it('releases even when the pushed fn throws', async () => {
		const guard = createEchoGuard();
		expect(() =>
			guard.run(() => {
				throw new Error('boom');
			})
		).toThrow('boom');

		await microtask();
		expect(guard.suppressed).toBe(false);
	});
});
