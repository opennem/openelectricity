/**
 * Average power: each bucket's energy divided by the hours it covers
 * (MWh ÷ h = MW). Unlike energy, it compares buckets of different lengths
 * fairly: a 28-day February with a 31-day March, or this month so far with
 * a whole month, when the open bucket's hours are only those elapsed.
 */

/** A display row; `_bandClose` marks a filtered band's drawing-only closing row.
 * @typedef {{ time: number, _bandClose?: boolean, [key: string]: any }} AveragePowerRow */

/**
 * Rows with `keys` divided by each row's hours. A drawing-only closing row
 * (`_bandClose`, which repeats the bucket before it at the band's end) uses
 * that bucket's hours. A missing value, or a bucket without positive hours,
 * is a gap.
 *
 * @template {AveragePowerRow} T
 * @param {T[]} rows
 * @param {string[]} keys
 * @param {(row: T) => number} hoursOf
 * @returns {T[]}
 */
export default function averagePower(rows, keys, hoursOf) {
	let hours = NaN;
	return rows.map((row) => {
		if (!row._bandClose || !Number.isFinite(hours)) hours = hoursOf(row);
		const next = /** @type {T} */ ({ ...row });
		for (const key of keys) {
			const value = row[key];
			/** @type {any} */ (next)[key] =
				value == null || !Number.isFinite(Number(value)) || !(hours > 0)
					? null
					: Number(value) / hours;
		}
		return next;
	});
}
