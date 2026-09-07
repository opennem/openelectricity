import { describe, expect, it } from 'vitest';
import { createTrackerPrefetchPlan } from './tracker-prefetch.js';

const DAY_MS = 86_400_000;

describe('createTrackerPrefetchPlan', () => {
	it('bounds nearby warming and leaves other grains to explicit range selections', () => {
		expect(createTrackerPrefetchPlan()).toEqual({
			widenMultiplier: 3,
			maxWidenMs: 7 * DAY_MS,
			grains: []
		});
	});
});
