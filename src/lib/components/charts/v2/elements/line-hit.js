import { indexOfTime } from '../binary-search.js';

/** @typedef {{ key?: string, group?: string, values: Array<{ time: number, value: number | null }> }} HitLine */

/**
 * The series of the line nearest `pointerY` at `time`, within half
 * `hitWidth` (px), or undefined when none is that close. `yOf` places a point
 * on the plot. Where lines overlap, the one drawn last (on top) wins.
 *
 * @param {HitLine[]} lines - The drawn lines, each sorted by time
 * @param {number} time
 * @param {number} pointerY
 * @param {(point: { time: number, value: number | null }) => number} yOf
 * @param {number} hitWidth
 * @returns {string | undefined}
 */
export function nearestLine(lines, time, pointerY, yOf, hitWidth) {
	let best = hitWidth / 2;
	/** @type {string | undefined} */
	let key;
	for (const line of lines) {
		const point = line.values[indexOfTime(line.values, time)];
		if (point?.value == null || Number.isNaN(point.value)) continue;
		const distance = Math.abs(yOf(point) - pointerY);
		if (distance <= best) {
			best = distance;
			key = line.key || line.group;
		}
	}
	return key;
}
