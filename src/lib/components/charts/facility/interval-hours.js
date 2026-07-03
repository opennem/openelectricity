import { bucketSpanHours } from '$lib/components/charts/v2/bucket-boundaries.js';
import { offsetHoursFromIana } from '$lib/components/charts/v2/network-time.js';

/** Average-length estimates (hours) for calendar intervals lacking a timestamp. */
const FALLBACK_HOURS = {
	'1M': 730,
	'3M': 91.25 * 24,
	quarter: 91.25 * 24,
	season: 91.25 * 24,
	half: 182.5 * 24,
	fy: 365 * 24,
	'1y': 365.25 * 24
};

/**
 * Convert a `displayInterval` token (used by the facility chart providers) to
 * the number of hours that interval spans. Calendar-aware intervals (`1M`,
 * `quarter`, `season`, `half`, `fy`, `1y`) vary in length, so pass the row's
 * `timestampMs` and the network `ianaTimeZone` to get the actual bucket length.
 *
 * Used by `FacilityFinancialDataProvider` (price) and
 * `FacilityEmissionsDataProvider` (intensity) on the **power** grains (5m/30m)
 * only, where there's no native energy: they derive
 *   derived = volumeMetric / (power_total × intervalHours)
 * and must agree on the conversion exactly. Energy intervals fetch `energy`
 * (MWh) directly and divide by it, so they don't call this.
 *
 * @param {string} displayInterval
 * @param {number} [timestampMs]
 * @param {string} [ianaTimeZone] - 'Australia/Brisbane' (NEM) or 'Australia/Perth' (WEM)
 * @returns {number}
 */
export function getIntervalHours(displayInterval, timestampMs, ianaTimeZone) {
	const offsetHours = offsetHoursFromIana(ianaTimeZone);

	switch (displayInterval) {
		case '5m':
			return 5 / 60;
		case '30m':
			return 30 / 60;
		case '1h':
			return 1;
		case '1d':
			return 24;
		case '7d':
			return 7 * 24;
		case '1M':
		case '3M':
		case 'quarter':
		case 'season':
		case 'half':
		case 'fy':
		case '1y': {
			if (timestampMs == null) {
				// No timestamp — fall back to average-length estimates (hours).
				return FALLBACK_HOURS[/** @type {keyof typeof FALLBACK_HOURS} */ (displayInterval)] ?? 24;
			}
			return bucketSpanHours(displayInterval, timestampMs, offsetHours);
		}
		default:
			return 24;
	}
}
