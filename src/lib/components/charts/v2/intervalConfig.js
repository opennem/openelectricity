/**
 * Interval Configuration
 *
 * Maps intervals to their metrics, chart styles, and viewport limits.
 * Iteration 1 only uses '5m'/power but the config is laid out for future intervals.
 */

/** @type {Array<{id: string, maxViewportDays: number, metric: string, curveType: string, label: string}>} */
export const INTERVAL_CONFIG = [
	{ id: '5m', maxViewportDays: 3, metric: 'power', curveType: 'straight', label: '5 min' },
	{ id: '1h', maxViewportDays: 14, metric: 'power', curveType: 'straight', label: '1 hour' },
	{ id: '1d', maxViewportDays: 90, metric: 'energy', curveType: 'step', label: '1 day' },
	{ id: '7d', maxViewportDays: 365, metric: 'energy', curveType: 'step', label: '1 week' },
	{ id: '1M', maxViewportDays: 730, metric: 'energy', curveType: 'step', label: '1 month' },
	{
		id: '3M',
		maxViewportDays: 1825,
		metric: 'energy',
		curveType: 'step',
		label: '3 months'
	},
	{
		id: '1y',
		maxViewportDays: Infinity,
		metric: 'energy',
		curveType: 'step',
		label: '1 year'
	}
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Get the appropriate interval config for a given viewport duration
 * @param {number} durationMs - Duration of the viewport in milliseconds
 * @returns {typeof INTERVAL_CONFIG[number]}
 */
export function getIntervalForDuration(durationMs) {
	const days = durationMs / MS_PER_DAY;
	for (const config of INTERVAL_CONFIG) {
		if (days <= config.maxViewportDays) {
			return config;
		}
	}
	return INTERVAL_CONFIG[INTERVAL_CONFIG.length - 1];
}
