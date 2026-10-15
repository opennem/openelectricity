/**
 * The first and last periods a chart plots inside the window: the rows
 * (display grain, keyed by period start) with a value in any series. The
 * window is the requested span, ending at "now" for live ranges, so its
 * ends rarely fall on the data's own periods; the range readout shows these
 * instead. Null when nothing in the window has a value yet.
 *
 * @param {{ data: Array<Record<string, any>>, seriesNames: string[] } | null | undefined} snapshot
 * @param {{ start: number, end: number }} window
 * @returns {{ start: number, end: number } | null}
 */
export function plottedExtent(snapshot, window) {
	if (!snapshot) return null;
	/** @type {number | undefined} */
	let start;
	/** @type {number | undefined} */
	let end;
	for (const row of snapshot.data) {
		const time = row.time;
		if (!Number.isFinite(time) || time < window.start || time > window.end) continue;
		if (!snapshot.seriesNames.some((name) => Number.isFinite(row[name]))) continue;
		start ??= time;
		end = time;
	}
	return start === undefined || end === undefined ? null : { start, end };
}
