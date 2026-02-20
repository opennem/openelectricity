/**
 * Date-range utilities for Facility Explorer.
 *
 * Provides constants and helpers for computing default date ranges
 * from facility units and range presets.
 */

/** Earliest selectable date */
export const MIN_DATE = '1998-12-01';

/**
 * Find the earliest `data_first_seen` date across a facility's units.
 *
 * @param {Array<{ data_first_seen?: string }>} units
 * @returns {string | null} YYYY-MM-DD or null
 */
export function getEarliestDate(units) {
	if (!units?.length) return null;
	/** @type {string | null} */
	let earliest = null;
	for (const unit of units) {
		const d = unit.data_first_seen;
		if (d && (!earliest || d < earliest)) earliest = d;
	}
	return earliest ? earliest.slice(0, 10) : null;
}

/**
 * Get default start date based on a range preset (in days).
 * For -1 ("All"), resolves from facility units or falls back to MIN_DATE.
 *
 * @param {number} days
 * @param {Array<{ data_first_seen?: string }> | undefined} units
 * @returns {string} YYYY-MM-DD
 */
export function getDateStartForRange(days, units) {
	if (days === -1) {
		const earliest = getEarliestDate(units ?? []);
		return earliest || MIN_DATE;
	}
	const date = new Date();
	date.setDate(date.getDate() - days);
	return date.toISOString().slice(0, 10);
}

/**
 * Get default end date (today).
 *
 * @returns {string} YYYY-MM-DD
 */
export function getDefaultDateEnd() {
	return new Date().toISOString().slice(0, 10);
}
