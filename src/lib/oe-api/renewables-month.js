/**
 * Pure date / trim helpers for the renewables fetch pipeline
 * (`fetch-renewables.server.js`). Kept free of any `$env` or OpenElectricity
 * client imports so the month-boundary logic can be unit-tested in isolation.
 */

/** NEM energy data is anchored to a fixed `+10:00` offset (no DST). */
const NEM_OFFSET_MS = 10 * 60 * 60 * 1000;

/**
 * Latest `history.last` across a set of StatsData (ISO-8601 sorts
 * lexicographically so direct comparison works for monthly timestamps).
 *
 * @param {StatsData[]} stats
 * @returns {string | null}
 */
export function findLatestLastDate(stats) {
	/** @type {string | null} */
	let latest = null;
	for (const d of stats) {
		const last = d.history?.last;
		if (last && (!latest || last > latest)) latest = last;
	}
	return latest;
}

/**
 * Number of whole months between two ISO month timestamps.
 *
 * @param {string} earlierIso
 * @param {string} laterIso
 * @returns {number}
 */
export function monthsBetween(earlierIso, laterIso) {
	const [ey, em] = earlierIso.split('T')[0].split('-').map(Number);
	const [ly, lm] = laterIso.split('T')[0].split('-').map(Number);
	return ly * 12 + (lm - 1) - (ey * 12 + (em - 1));
}

/**
 * Trim every StatsData record so its `history.last` does not extend past
 * `targetLast`. Drops any trailing months from `history.data` accordingly.
 * Records that already end on or before `targetLast` are returned as-is.
 *
 * @param {StatsData[]} stats
 * @param {string} targetLast — ISO month timestamp (e.g. '2026-03-01T00:00:00+10:00')
 * @returns {StatsData[]}
 */
export function trimStatsDataToLastDate(stats, targetLast) {
	return stats.map((d) => {
		if (!d.history?.last || d.history.last <= targetLast) return d;
		const dropCount = monthsBetween(targetLast, d.history.last);
		if (dropCount <= 0) return d;
		return {
			...d,
			history: {
				...d.history,
				last: targetLast,
				data: d.history.data.slice(0, d.history.data.length - dropCount)
			}
		};
	});
}

/**
 * First day of the previous calendar month as an ISO month timestamp matching
 * the pipeline's `+10:00` convention. Used to drop the in-progress current month
 * the OE 1M endpoint returns (a partial month would otherwise drag the chart's
 * trailing 12-month rolling sum down into a visible end-of-line dip).
 *
 * The current month is read in NEM-local time (`+10:00`), NOT UTC: for the first
 * ten hours of each AEST month UTC is still in the previous month, which would
 * make this return two months back and drop an already-complete month from the
 * chart (e.g. showing May instead of June on the morning of 1 July AEST).
 *
 * @returns {string}
 */
export function lastCompleteMonthIso() {
	const nowNem = new Date(Date.now() + NEM_OFFSET_MS);
	let year = nowNem.getUTCFullYear();
	// getUTCMonth() (on the NEM-shifted instant) is the 0-based current month —
	// i.e. the 1-based *previous* month — so January (0) rolls back to December
	// of the prior year.
	let month = nowNem.getUTCMonth();
	if (month === 0) {
		year -= 1;
		month = 12;
	}
	return `${year}-${String(month).padStart(2, '0')}-01T00:00:00+10:00`;
}
