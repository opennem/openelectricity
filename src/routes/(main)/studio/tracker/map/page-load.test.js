import { afterEach, describe, expect, it, vi } from 'vitest';
import { load } from './+page.js';

describe('map tracker page load', () => {
	afterEach(() => vi.restoreAllMocks());

	it('serialises the chart anchor used by the hydrating client', () => {
		vi.spyOn(Date, 'now').mockReturnValue(1_765_432_100_000);

		const data = load({ url: new URL('https://example.test/studio/tracker/map') });

		expect(data.nowMs).toBe(1_765_432_100_000);
		expect(data.region).toBe('au');
	});
});
