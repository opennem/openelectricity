import { describe, it, expect } from 'vitest';
import { createRequestGuard } from './request-guard.js';

describe('createRequestGuard', () => {
	it('returns an object with a next method', () => {
		const guard = createRequestGuard();
		expect(typeof guard.next).toBe('function');
	});

	it('isCurrent returns true when no subsequent next() call', () => {
		const guard = createRequestGuard();
		const { isCurrent } = guard.next();
		expect(isCurrent()).toBe(true);
	});

	it('isCurrent returns false after a subsequent next() call', () => {
		const guard = createRequestGuard();
		const first = guard.next();
		guard.next();
		expect(first.isCurrent()).toBe(false);
	});

	it('only the latest call is current', () => {
		const guard = createRequestGuard();
		const first = guard.next();
		const second = guard.next();
		const third = guard.next();

		expect(first.isCurrent()).toBe(false);
		expect(second.isCurrent()).toBe(false);
		expect(third.isCurrent()).toBe(true);
	});

	it('multiple guards are independent', () => {
		const guardA = createRequestGuard();
		const guardB = createRequestGuard();

		const a1 = guardA.next();
		const b1 = guardB.next();

		guardA.next(); // invalidates a1

		expect(a1.isCurrent()).toBe(false);
		expect(b1.isCurrent()).toBe(true); // b1 unaffected
	});

	it('isCurrent remains stable when checked multiple times', () => {
		const guard = createRequestGuard();
		const { isCurrent } = guard.next();
		expect(isCurrent()).toBe(true);
		expect(isCurrent()).toBe(true);
		expect(isCurrent()).toBe(true);
	});
});
