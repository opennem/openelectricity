/**
 * Binary-search helpers for time-sorted chart rows ({ time: number, ... }).
 * The caches and visible windows in the v2 chart system are always sorted by
 * `time`, so slicing and lookups should be O(log n), not linear scans.
 */

import { bisector } from 'd3-array';

const timeBisector = bisector((/** @type {{ time: number }} */ d) => d.time);

/**
 * Index of the first row with `time >= t` (lower bound). Returns `data.length`
 * when every row is earlier than `t`.
 *
 * @type {(data: Array<{ time: number }>, t: number) => number}
 */
export const bisectTime = timeBisector.left;

/**
 * Index of the first row with `time > t` (upper bound) — the exclusive end of
 * an inclusive [start, t] slice.
 *
 * @type {(data: Array<{ time: number }>, t: number) => number}
 */
export const bisectTimeRight = timeBisector.right;

/**
 * Index of the row whose `time` equals `t` exactly, or -1 when absent.
 *
 * @param {Array<{ time: number }>} data - Rows sorted ascending by `time`
 * @param {number} t - Timestamp (ms)
 * @returns {number}
 */
export function indexOfTime(data, t) {
	const i = bisectTime(data, t);
	return i < data.length && data[i].time === t ? i : -1;
}

/**
 * Merge two time-sorted row arrays into one, deduping by timestamp with rows
 * from `incoming` winning on equal `time` — a fresh fetch of an overlapping
 * bucket replaces the cached (possibly still-growing) row.
 *
 * O(n + m) two-pointer merge; neither input is mutated.
 *
 * @param {Array<{ time: number }>} existing - Rows sorted ascending by `time`
 * @param {Array<{ time: number }>} incoming - Rows sorted ascending by `time`
 * @returns {Array<{ time: number }>}
 */
export function mergeSortedByTime(existing, incoming) {
	/** @type {Array<{ time: number }>} */
	const merged = [];
	let i = 0;
	let j = 0;

	while (i < existing.length && j < incoming.length) {
		const a = existing[i];
		const b = incoming[j];
		if (a.time < b.time) {
			merged.push(a);
			i++;
		} else if (a.time > b.time) {
			merged.push(b);
			j++;
		} else {
			merged.push(b); // equal timestamps — incoming wins
			i++;
			j++;
		}
	}
	while (i < existing.length) merged.push(existing[i++]);
	while (j < incoming.length) merged.push(incoming[j++]);

	return merged;
}
