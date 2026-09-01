const AUTO_TWH_THRESHOLD_MWH = 100_000;

/**
 * Choose the initial energy unit from the largest positive generation stack.
 * The first six-digit MWh value is promoted directly to TWh; GWh remains
 * available as a manual chart option.
 *
 * @param {any[]} rows
 * @param {string[]} seriesNames
 * @returns {SiPrefix}
 */
export function automaticGenerationEnergyPrefix(rows, seriesNames) {
	let maximumMWh = 0;
	for (const row of rows) {
		let totalMWh = 0;
		for (const name of seriesNames) {
			const value = row[name];
			if (Number.isFinite(value) && value > 0) totalMWh += value;
		}
		if (totalMWh > maximumMWh) maximumMWh = totalMWh;
	}
	return maximumMWh >= AUTO_TWH_THRESHOLD_MWH ? 'T' : 'M';
}

/**
 * Smaller display units are whole-number quantities; GW/GWh/TWh need enough
 * precision to avoid turning a valid converted value into zero.
 *
 * @param {SiPrefix} prefix
 */
export function generationUnitMaximumFractionDigits(prefix) {
	return prefix === 'M' ? 0 : 2;
}
