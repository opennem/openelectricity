import { describe, expect, it } from 'vitest';
import { createTrackerPrefetchPlan } from './tracker-prefetch.js';

const DAY_MS = 86_400_000;

describe('createTrackerPrefetchPlan', () => {
	it('warms daily and monthly data for the requested metric', () => {
		expect(createTrackerPrefetchPlan('emissions_intensity')).toEqual({
			widenMultiplier: 3,
			grains: [
				{ interval: '1d', metric: 'emissions_intensity', windowMs: 30 * DAY_MS },
				{ interval: '1M', metric: 'emissions_intensity', windowMs: 11_000 * DAY_MS }
			]
		});
	});
});
