/** Shared date-range utilities for chart viewports and API caching. */

/** Earliest selectable date across the data set. */
export const MIN_DATE = '1998-12-01';

/**
 * Epoch ms of MIN_DATE (UTC midnight) — the floor for chart viewports and
 * data fetches; no OE data exists before it.
 */
export const EARLIEST_DATA_MS = new Date(MIN_DATE + 'T00:00:00Z').getTime();

const HISTORICAL_WINDOW_MARGIN_MS = 24 * 60 * 60 * 1000;

/**
 * Whether a network-local window ended more than one day ago.
 *
 * @param {string | undefined} dateEnd
 * @param {number} [nowMs]
 * @returns {boolean}
 */
export function isHistoricalWindow(dateEnd, nowMs = Date.now()) {
	if (!dateEnd) return false;
	const localDateEnd = dateEnd.includes('T') ? dateEnd : `${dateEnd}T00:00:00`;
	const endMs = new Date(`${localDateEnd}+08:00`).getTime();
	return Number.isFinite(endMs) && nowMs - endMs > HISTORICAL_WINDOW_MARGIN_MS;
}

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
