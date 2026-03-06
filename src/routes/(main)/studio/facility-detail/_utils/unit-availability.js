/**
 * Unit availability calculation from interval power data.
 *
 * For each unit series, calculates the percentage of intervals where
 * the unit was generating (power > 0). Useful for coal plants with
 * multiple units that may be offline for maintenance.
 */

/**
 * Calculate per-unit availability from interval data.
 *
 * @param {Array<Record<string, any>>} rows - Interval data rows
 * @param {string[]} seriesNames - Series names (e.g. ['power_UNIT1', 'power_UNIT2'])
 * @returns {Array<{ unit: string, seriesName: string, availability: number }>}
 *   availability as 0–100 percentage
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

		// Strip the metric prefix to get the unit code (e.g. 'power_UNIT1' → 'UNIT1')
		const unit = name.replace(/^(power|energy)_/, '');

		return {
			unit,
			seriesName: name,
			availability: total > 0 ? (generating / total) * 100 : 0
		};
	});
}
