import { afterEach, describe, expect, it, vi } from 'vitest';
import { load } from './+page.js';

describe('dashboard page load', () => {
	afterEach(() => vi.restoreAllMocks());

	it('serialises the range anchor used by the hydrating client', () => {
		vi.spyOn(Date, 'now').mockReturnValue(1_765_432_100_000);

		const data = load(
			/** @type {Parameters<typeof load>[0]} */ ({
				url: new URL('https://example.test/tracker/dashboard')
			})
		);

		expect(data.nowMs).toBe(1_765_432_100_000);
		expect(data.range).toMatchObject({ kind: 'preset', days: 7, intervalId: '30m' });
	});
});
