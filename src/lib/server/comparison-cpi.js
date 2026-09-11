import { createSwrCache } from './swr-cache.js';
import { COMPARISON_CPI_SOURCE, parseComparisonCpi } from '$lib/comparison-cpi.js';
export const comparisonCpi = createSwrCache({
	edgeCacheKey: 'https://edge-cache.openelectricity.org.au/comparison-cpi-v1',
	fetcher: async () => {
		try {
			const response = await fetch(COMPARISON_CPI_SOURCE, { signal: AbortSignal.timeout(8000) });
			if (!response.ok) throw new Error('CPI data unavailable');
			return parseComparisonCpi(await response.json());
		} catch {
			return { values: [], reference: null, error: 'CPI data is unavailable. Reload to retry.' };
		}
	},
	isFresh: (_, at) => Date.now() - at < 6 * 60 * 60 * 1000,
	isCacheable: (value) => value.values.length > 0
});
