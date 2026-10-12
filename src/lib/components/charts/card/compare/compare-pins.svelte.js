/**
 * Compare pins — the rows a Timeline chart drew at the comparison's A and B,
 * held while its series stay the same. A chart's snapshot covers only the
 * visible window, so without them a comparison would blank on every pan and
 * a date panned off screen could never be compared. A new region, grouping,
 * metric, interval or filter (a new `identity`) drops them: those rows no
 * longer describe what the chart draws.
 *
 * @param {{
 *   identity: () => string,
 *   snapshot: () => import('../types.js').ChartSnapshot | null,
 *   pair: () => import('./chart-compare.js').ComparePair
 * }} input
 */
export function createComparePins(input) {
	/** @typedef {Record<number, Record<string, any>>} HeldRows */
	/** What the last read held. Plain memory, not state: the derived below is
	 * its only reader and writer. */
	let held = { identity: '', rows: /** @type {HeldRows} */ ({}) };
	const rows = $derived.by(() => {
		const identity = input.identity();
		const snapshot = input.snapshot();
		const { a, b } = input.pair();
		/** @type {HeldRows} */
		const previous = held.identity === identity ? held.rows : {};
		/** @type {HeldRows} */
		const next = {};
		for (const time of [a, b]) {
			if (time === null) continue;
			const row = snapshot?.data.find((entry) => entry.time === time) ?? previous[time];
			if (row) next[time] = row;
		}
		held = { identity, rows: next };
		return next;
	});
	return {
		/** The held rows by time. */
		get rows() {
			return rows;
		}
	};
}
