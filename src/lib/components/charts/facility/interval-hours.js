/**
 * Convert a `displayInterval` token (used by the facility chart providers) to
 * the number of hours that interval spans. `1M` is calendar-aware: pass the
 * row's `timestampMs` so the result reflects the actual length of that month.
 *
 * Shared between `FacilityFinancialDataProvider` (price derivation) and
 * `FacilityEmissionsDataProvider` (intensity derivation) — both compute
 *   derived = volumeMetric / (power_total × intervalHours)
 * and must agree on the conversion exactly.
 *
 * @param {string} displayInterval
 * @param {number} [timestampMs]
 * @returns {number}
 */
export function getIntervalHours(displayInterval, timestampMs) {
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
		case '1M': {
			if (!timestampMs) return 730;
			const d = new Date(timestampMs);
			const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
			return daysInMonth * 24;
		}
		case '3M':
			return 91.25 * 24;
		case '1y':
			return 365.25 * 24;
		default:
			return 24;
	}
}
