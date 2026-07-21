/**
 * Date-range utilities for facility-style time-series charts.
 *
 * Constants and helpers for computing default date ranges from facility
 * units and range presets. Lives in `$lib/utils/` so any chart route can
 * consume the same logic; callers today: `/facility/[code]` and the
 * facility chart components.
 */

/** Earliest selectable date across the data set. */
export const MIN_DATE = '1998-12-01';

/**
 * Epoch ms of MIN_DATE (UTC midnight) — the floor for chart viewports and
 * data fetches; no OE data exists before it.
 */
export const EARLIEST_DATA_MS = new Date(MIN_DATE + 'T00:00:00Z').getTime();

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
