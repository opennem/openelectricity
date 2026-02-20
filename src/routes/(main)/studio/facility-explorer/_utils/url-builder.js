/**
 * URL builder for Facility Explorer.
 *
 * Constructs query-string URLs for navigation and replaceState.
 */

/**
 * Build a Facility Explorer URL with the given params.
 *
 * When `range` is set, `date_start` / `date_end` are omitted (the server
 * derives them from the range preset).
 *
 * @param {{ facility?: string | null, dateStart?: string | null, dateEnd?: string | null, range?: number | string | null }} params
 * @returns {string} e.g. "?facility=ABC&days=7"
 */
export function buildFacilityExplorerUrl({ facility, dateStart, dateEnd, range }) {
	const params = new URLSearchParams();

	if (facility) params.set('facility', facility);
	if (range) {
		params.set('days', String(range));
	} else {
		if (dateStart) params.set('date_start', dateStart);
		if (dateEnd) params.set('date_end', dateEnd);
	}

	return `?${params.toString()}`;
}
