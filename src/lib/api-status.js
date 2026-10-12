/**
 * @typedef {Object} ApiStatusSummary
 * @property {string} status
 * @property {number} apiLatencyMs
 * @property {number} dataLatencyMs
 * @property {string} checkedAt
 * @property {string} statusColor
 * @property {string} statusLabel
 */

export const API_STATUS_URL = 'https://status.openelectricity.org.au';

const TTL_MS = 5 * 60 * 1000;

/** @type {{ at: number, promise: Promise<ApiStatusSummary | null> } | null} */
let cached = null;

/**
 * Fetch the API status summary. The result is shared for a few minutes so the
 * windowed and fullscreen footers (which remount on every mode toggle) don't
 * refetch it each time. Resolves to `null` on any failure.
 *
 * @returns {Promise<ApiStatusSummary | null>}
 */
export function fetchApiStatus() {
	if (cached && Date.now() - cached.at < TTL_MS) return cached.promise;

	const promise = fetch(`${API_STATUS_URL}/api/summary`)
		.then((res) => (res.ok ? res.json() : null))
		.catch(() => null);
	cached = { at: Date.now(), promise };
	return promise;
}
