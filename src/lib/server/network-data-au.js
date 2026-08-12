/**
 * Server-side NEM+WEM merge for the tracker's All Regions ('au') scope.
 *
 * The OE API's own AU network joins the two grids on naive wall-clock strings,
 * which displaces WEM by two real hours and leaves the newest ~2h NEM-only —
 * so /api/network/data builds the national response here instead, from one
 * NEM and one WEM upstream call whose result series are concatenated into a
 * single response. The client processors (`collectSeriesByTimestamp` in
 * 'sum' mode) then sum any series that share a fuel-tech group and land on
 * the same instant, with no client-side changes.
 *
 * The client strips every timestamp's offset and re-applies the scope's
 * networkTimezone (+10:00 for 'au'), so the merge rule is interval-dependent:
 *
 * - Sub-daily ('5m', '1h'): WEM rows are rewritten +2h on the naive string
 *   (same real instant relabelled AEST) and the WEM upstream window shifts
 *   −2h to cover the same absolute range. The merged series are then trimmed
 *   to the two networks' common latest timestamp so the live edge can't
 *   cliff down to NEM-only (WEM's wall clock trails NEM's by two hours).
 * - Daily and coarser: rows concatenate untouched. Each network's day is its
 *   own local calendar day; equal naive labels collide onto one client row
 *   and sum — a calendar-date join, which is the defensible semantics at
 *   daily grain (shifting would split every day into two half-rows).
 *
 * A missing WEM response (fetch failure / NoDataFound) degrades to the
 * NEM-only response, matching the map minis' `miniSeriesForAu`.
 *
 * Known limit: `process-network-data.js` evaluates battery charge/discharge
 * splits over the whole merged response — if WEM ever reports only the
 * aggregate `battery` series, WEM storage drops out of the client stack
 * (parity with the standalone WEM card).
 */

import { stripDateTimezone } from '$lib/utils/date-format.js';
import { offsetMsFromOffset } from '$lib/components/charts/v2/network-time.js';

const SUB_DAILY_INTERVALS = new Set(['5m', '1h']);
const AEST_SUFFIX = '+10:00';
const WEM_SHIFT_MS = offsetMsFromOffset(AEST_SUFFIX) - offsetMsFromOffset('+08:00');

/** @param {string} interval */
function isSubDailyInterval(interval) {
	return SUB_DAILY_INTERVALS.has(interval);
}

/**
 * Shift a timezone-naive `YYYY-MM-DDTHH:mm:ss` string by `deltaMs`.
 * @param {string | undefined} naive
 * @param {number} deltaMs
 */
function shiftNaive(naive, deltaMs) {
	if (!naive) return naive;
	return new Date(new Date(`${naive}Z`).getTime() + deltaMs).toISOString().slice(0, 19);
}

/**
 * Per-network upstream date ranges for an 'au' request. The client sends
 * NEM-local naive dates; sub-daily WEM calls shift −2h so both networks
 * cover the same absolute window. Daily+ windows pass through — each
 * network serves its own local calendar days.
 *
 * @param {string} interval
 * @param {string | undefined} dateStart
 * @param {string | undefined} dateEnd
 */
export function auUpstreamRanges(interval, dateStart, dateEnd) {
	const nem = { dateStart, dateEnd };
	if (!isSubDailyInterval(interval)) return { nem, wem: { ...nem } };
	return {
		nem,
		wem: {
			dateStart: shiftNaive(dateStart, -WEM_SHIFT_MS),
			dateEnd: shiftNaive(dateEnd, -WEM_SHIFT_MS)
		}
	};
}

/** Rewrite a WEM timestamp to the same real instant labelled AEST.
 *  @param {string} timestamp */
function toAestInstant(timestamp) {
	return `${shiftNaive(stripDateTimezone(timestamp), WEM_SHIFT_MS)}${AEST_SUFFIX}`;
}

/**
 * Latest naive timestamp across every series of a response's data entries.
 * Series rows ascend chronologically (OE time-series order, preserved by the
 * relabel map), so only each series' last row is read. Labels are ISO
 * `YYYY-MM-DDTHH:mm:ss…`, so string comparison is chronological once both
 * networks share the AEST labelling.
 * @param {any[]} dataEntries
 * @returns {string | null}
 */
function maxNaiveTimestamp(dataEntries) {
	/** @type {string | null} */
	let max = null;
	for (const entry of dataEntries) {
		for (const series of entry.results ?? []) {
			const last = series.data?.at(-1);
			if (!last) continue;
			const naive = stripDateTimezone(last[0]);
			if (max === null || naive > max) max = naive;
		}
	}
	return max;
}

/**
 * Drop the trailing rows newer than `cutoff` (rows ascend chronologically);
 * returns the input array by reference when nothing trims.
 * @param {[string, number][]} rows
 * @param {string} cutoff
 */
function trimAfter(rows, cutoff) {
	let end = rows.length;
	while (end > 0 && stripDateTimezone(rows[end - 1][0]) > cutoff) end--;
	return end === rows.length ? rows : rows.slice(0, end);
}

/**
 * Merge a WEM response into a NEM response for the 'au' scope.
 *
 * @param {any} nemResponse - Raw OE response ({ data: [{ metric, results }] })
 * @param {any} wemResponse - Same shape, or null on WEM failure → NEM-only
 * @param {string} interval
 * @returns {any} One response in the same shape
 */
export function mergeAuResponses(nemResponse, wemResponse, interval) {
	if (!wemResponse?.data?.length) return nemResponse;

	const subDaily = isSubDailyInterval(interval);

	// Relabel WEM rows onto the AEST clock at sub-daily grains; daily+ rows
	// keep their local-calendar-day labels (see module doc).
	const wemData = wemResponse.data.map((/** @type {any} */ entry) => ({
		...entry,
		results: (entry.results ?? []).map((/** @type {any} */ series) => ({
			...series,
			data: subDaily
				? (series.data ?? []).map((/** @type {[string, number]} */ [timestamp, value]) => [
						toAestInstant(timestamp),
						value
					])
				: series.data
		}))
	}));

	if (!nemResponse?.data?.length) return { ...(nemResponse ?? {}), data: wemData };

	// Concatenate result series per metric; WEM-only metrics append whole.
	const merged = nemResponse.data.map((/** @type {any} */ entry) => {
		const wemEntry = wemData.find((/** @type {any} */ e) => e.metric === entry.metric);
		if (!wemEntry) return entry;
		return { ...entry, results: [...(entry.results ?? []), ...(wemEntry.results ?? [])] };
	});
	for (const wemEntry of wemData) {
		if (!nemResponse.data.some((/** @type {any} */ e) => e.metric === wemEntry.metric)) {
			merged.push(wemEntry);
		}
	}

	// Trim the sub-daily live edge to the common latest timestamp — without
	// this the newest ~2h of a stacked chart drops by WEM's contribution.
	// When both feeds already share a live edge (the common case) the merged
	// arrays pass through untouched.
	let data = merged;
	if (subDaily) {
		const maxNem = maxNaiveTimestamp(nemResponse.data);
		const maxWem = maxNaiveTimestamp(wemData);
		if (maxNem !== null && maxWem !== null && maxNem !== maxWem) {
			const cutoff = maxNem < maxWem ? maxNem : maxWem;
			data = merged.map((/** @type {any} */ entry) => ({
				...entry,
				results: (entry.results ?? []).map((/** @type {any} */ series) => ({
					...series,
					data: trimAfter(series.data ?? [], cutoff)
				}))
			}));
		}
	}

	return { ...nemResponse, data };
}
