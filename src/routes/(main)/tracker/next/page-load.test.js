import { afterEach, describe, expect, it, vi } from 'vitest';
import { load } from './+page.js';

describe('tracker page load', () => {
	afterEach(() => vi.restoreAllMocks());

	it('serialises the range anchor used by the hydrating client', () => {
		vi.spyOn(Date, 'now').mockReturnValue(1_765_432_100_000);

		const data = load(
			/** @type {Parameters<typeof load>[0]} */ ({
				url: new URL('https://example.test/tracker/next')
			})
		);

		expect(data.nowMs).toBe(1_765_432_100_000);
		expect(data.range).toEqual({ kind: 'preset', days: 3, intervalId: '30m' });
		expect(data.region).toBe('_all');
		expect(data.group).toBe('simple');
		expect(data.tablePanelOpen).toBe(true);
	});
});
