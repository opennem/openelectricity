/**
 * Whether every unit of a facility is retired — the pane and chart-window
 * logic both key off this to treat the facility as historical.
 * @param {any[]} units
 * @returns {boolean}
 */
export function isFullyRetired(units) {
	return units.length > 0 && units.every((/** @type {any} */ u) => u.status_id === 'retired');
}

/**
 * Retired-data anchor for a set of units: the latest `data_last_seen` (or,
 * failing that, `closure_date`) when every unit is retired, else null. Retired
 * facilities have no data near "now", so chart windows anchor to this instead
 * of surfacing an empty range.
 * @param {any[]} units
 * @returns {number | null} epoch ms, or null when not fully retired / no anchor
 */
export function retiredAnchorMs(units) {
	if (!isFullyRetired(units)) return null;

	/** @type {string | null} */
	let anchor = null;
	for (const u of units) {
		const d = u.data_last_seen;
		if (d && (!anchor || d > anchor)) anchor = d;
	}
	if (!anchor) {
		for (const u of units) {
			const d = u.closure_date;
			if (d && (!anchor || d > anchor)) anchor = d;
		}
	}
	if (!anchor) return null;

	const t = new Date(anchor).getTime();
	return Number.isFinite(t) ? t : null;
}

/**
 * Anchor for a chart window's end: "now" normally, or the retired anchor
 * (clamped to now) when every unit is retired, so a decommissioned facility
 * (or unit) still shows its final operating days instead of an empty range.
 * @param {any[]} units
 * @returns {number} epoch ms
 */
export function dataEndMs(units) {
	const now = Date.now();
	const anchor = retiredAnchorMs(units);
	return anchor === null ? now : Math.min(anchor, now);
}
