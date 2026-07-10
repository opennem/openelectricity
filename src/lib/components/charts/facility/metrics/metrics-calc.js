/**
 * Pure metric computation for the facility metrics section.
 *
 * Every function takes already-aggregated data (the visible-range rows emitted
 * by the facility data providers / chart) and returns a number — no side
 * effects, no fetching, no Svelte. This keeps the maths unit-testable and lets
 * the same helpers drive both the `/facility/[code]` page and the `/facilities`
 * detail panel.
 *
 * Energy is MWh, power is MW, market value is $, emissions are tCO₂e.
 */

/**
 * Sum the finite numeric values of one key across rows.
 * @param {Array<Record<string, any>>} rows
 * @param {string} key
 * @returns {number}
 */
export function sumSeries(rows, key) {
	let total = 0;
	for (const row of rows) {
		const val = row[key];
		if (typeof val === 'number' && !isNaN(val)) total += val;
	}
	return total;
}

/**
 * Sum the finite numeric values of several keys across rows. Convenience for
 * "total energy / total emissions across every unit series".
 * @param {Array<Record<string, any>>} rows
 * @param {string[]} keys
 * @returns {number}
 */
export function sumAllSeries(rows, keys) {
	let total = 0;
	for (const key of keys) {
		total += sumSeries(rows, key);
	}
	return total;
}

/**
 * Fold signed energy series into the shapes the headline metrics need:
 * `signed` (net), `throughput` (Σ|energy| — a storage facility's headline,
 * since its signed net is negative by physics), and the `discharge`/`charge`
 * split (for round-trip efficiency). One tested home for the fold shared by
 * the facility metrics grid and the unit slide-out.
 * @param {Array<Record<string, any>>} rows
 * @param {string[]} keys
 * @returns {{ signed: number, throughput: number, discharge: number, charge: number }}
 */
export function sumEnergy(rows, keys) {
	let signed = 0;
	let throughput = 0;
	let discharge = 0;
	let charge = 0;
	for (const row of rows) {
		for (const key of keys) {
			const v = row[key];
			if (typeof v === 'number' && !isNaN(v)) {
				signed += v;
				throughput += Math.abs(v);
				if (v > 0) discharge += v;
				else charge += -v;
			}
		}
	}
	return { signed, throughput, discharge, charge };
}

/**
 * Hours spanned by a set of time-ordered rows (first → last `time` in ms).
 * @param {Array<Record<string, any>>} rows - Each row must carry `time` (ms)
 * @returns {number}
 */
export function getHoursInRange(rows) {
	if (!rows.length) return 0;
	const firstTime = rows[0].time;
	const lastTime = rows[rows.length - 1].time;
	return (lastTime - firstTime) / 3_600_000;
}

/**
 * Interval length of time-ordered rows in hours (gap between the first two
 * rows). Returns 0 when there aren't enough rows to measure.
 * @param {Array<Record<string, any>>} rows
 * @returns {number}
 */
export function getIntervalHours(rows) {
	if (rows.length < 2) return 0;
	return (rows[1].time - rows[0].time) / 3_600_000;
}

/**
 * Whether time-ordered rows are sub-daily (power grain) — the gap between the
 * first two rows is under two hours. Daily/monthly energy data returns false.
 * Gates the interval-derived metrics (running hours, starts, unit availability).
 * @param {Array<Record<string, any>>} rows
 * @returns {boolean}
 */
export function isSubDailyData(rows) {
	if (rows.length < 2) return false;
	const gap = rows[1].time - rows[0].time;
	return gap > 0 && gap < 7_200_000;
}

/**
 * Capacity factor (%) — energy as a share of the theoretical maximum
 * (capacity × hours). Callers pass capacity with the canonical precedence
 * (maximum falling back to registered — see $lib/utils/capacity.js).
 * @param {number} energy - MWh
 * @param {number} capacity - MW
 * @param {number} hours
 * @returns {number} 0–100 (can exceed 100 if the capacity value understates output)
 */
export function capacityFactor(energy, capacity, hours) {
	if (capacity <= 0 || hours <= 0) return 0;
	return (energy / (capacity * hours)) * 100;
}

/**
 * Average price received ($/MWh) — market value divided by energy.
 * @param {number} marketValue - $
 * @param {number} energy - MWh
 * @returns {number}
 */
export function avgPriceReceived(marketValue, energy) {
	if (energy === 0) return 0;
	return marketValue / energy;
}

/**
 * Peak bucket across the range — the row with the highest positive-series total,
 * tagged with its timestamp so callers can label the period and annotate the
 * chart. When `intervalHours` > 0 the row total is treated as energy (MWh) and
 * divided back to power (MW); pass 0 to keep the raw energy.
 * @param {Array<Record<string, any>>} rows
 * @param {string[]} seriesNames
 * @param {number} [intervalHours=0]
 * @returns {{ value: number, time: number, date: any } | null}
 */
export function peakBucket(rows, seriesNames, intervalHours = 0) {
	/** @type {{ value: number, time: number, date: any } | null} */
	let peak = null;
	for (const row of rows) {
		let rowTotal = 0;
		for (const name of seriesNames) {
			const val = row[name];
			if (typeof val === 'number' && val > 0) rowTotal += val;
		}
		const value = intervalHours > 0 ? rowTotal / intervalHours : rowTotal;
		if (!peak || value > peak.value) peak = { value, time: row.time, date: row.date };
	}
	return peak;
}

/**
 * Running hours — number of intervals where any series generated, in hours.
 * @param {Array<Record<string, any>>} powerData
 * @param {string[]} seriesNames
 * @param {number} intervalMinutes
 * @returns {number}
 */
export function runningHours(powerData, seriesNames, intervalMinutes) {
	let count = 0;
	for (const row of powerData) {
		for (const name of seriesNames) {
			const val = row[name];
			if (typeof val === 'number' && val > 0) {
				count++;
				break;
			}
		}
	}
	return (count * intervalMinutes) / 60;
}

/**
 * Whether a fuel tech is the charging/pumping side of a storage pair. A
 * charge/discharge pair describes one store — storage sums and durations
 * count only the discharge side, whose capacity is generation power.
 *
 * @param {string | null | undefined} fueltechId
 * @returns {boolean}
 */
export function isChargingSideUnit(fueltechId) {
	const ft = fueltechId ?? '';
	return ft.endsWith('_charging') || ft === 'pumps';
}

/**
 * Storage duration in hours — energy capacity over discharge capacity, or
 * null when either side is missing/zero.
 *
 * @param {number} storageMWh
 * @param {number} powerMW
 * @returns {number | null}
 */
export function storageDurationHours(storageMWh, powerMW) {
	return storageMWh > 0 && powerMW > 0 ? storageMWh / powerMW : null;
}

/**
 * DC:AC ratio for a solar farm (DC array / AC connection). Returns null when
 * the ratio isn't meaningful (no oversizing, or implausibly high).
 * @param {number | null | undefined} capacityRegistered - DC (MW)
 * @param {number | null | undefined} capacityMaximum - AC (MW)
 * @returns {number | null}
 */
export function dcAcRatio(capacityRegistered, capacityMaximum) {
	if (!capacityRegistered || !capacityMaximum || capacityMaximum <= 0) return null;
	const ratio = capacityRegistered / capacityMaximum;
	if (ratio < 1.05 || ratio > 3) return null;
	return ratio;
}

/**
 * Per-unit availability (%) from interval data — the share of non-null
 * intervals where the unit generated (power > 0).
 * @param {Array<Record<string, any>>} rows
 * @param {string[]} seriesNames
 * @returns {Array<{ unit: string, seriesName: string, availability: number }>}
 */
export function computeUnitAvailability(rows, seriesNames) {
	if (!rows.length || !seriesNames.length) return [];

	return seriesNames.map((name) => {
		let generating = 0;
		let total = 0;

		for (const row of rows) {
			const val = row[name];
			if (val === null || val === undefined) continue;
			total++;
			if (typeof val === 'number' && val > 0) generating++;
		}

		const unit = name.replace(/^(power|energy)_/, '');
		return {
			unit,
			seriesName: name,
			availability: total > 0 ? (generating / total) * 100 : 0
		};
	});
}
