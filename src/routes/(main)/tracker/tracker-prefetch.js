const DAY_MS = 86_400_000;

/**
 * Warm only nearby data in the active grain. Cross-grain history is fetched
 * on demand: speculative decades-wide scans compete with range selections.
 */
export function createTrackerPrefetchPlan() {
	return {
		widenMultiplier: 3,
		maxWidenMs: 7 * DAY_MS,
		grains: []
	};
}
