/**
 * Pure metric computation functions for facility detail views.
 *
 * All functions take pre-processed data arrays and return computed values.
 * No side effects, no API calls — just maths.
 */

/**
 * Sum all numeric values for a given key across rows.
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
 * Calculate hours spanned by the data range.
 * @param {Array<Record<string, any>>} rows - Must have `time` field (ms)
 * @returns {number}
 */
export function getHoursInRange(rows) {
	if (!rows.length) return 0;
	const firstTime = rows[0].time;
	const lastTime = rows[rows.length - 1].time;
	return (lastTime - firstTime) / 3_600_000;
}

/**
 * Capacity factor: energy / (capacity × hours) as a percentage.
 * @param {number} energy - Total energy in MWh
 * @param {number} capacity - Registered capacity in MW
 * @param {number} hours - Hours in the range
 * @returns {number} Percentage (0–100)
 */
export function capacityFactor(energy, capacity, hours) {
	if (capacity <= 0 || hours <= 0) return 0;
	return (energy / (capacity * hours)) * 100;
}

/**
 * Average price received: market_value / energy.
 * @param {number} marketValue - Total market value in $
 * @param {number} energy - Total energy in MWh
 * @returns {number} $/MWh
 */
export function avgPriceReceived(marketValue, energy) {
	if (energy === 0) return 0;
	return marketValue / energy;
}

/**
 * Find peak power output across all series in the data.
 *
 * When `intervalHours` is provided (> 0), each row's energy sum (MWh) is
 * divided by it to convert to power (MW). This is necessary when the source
 * data uses the `energy` metric rather than `power`.
 *
 * @param {Array<Record<string, any>>} rows
 * @param {string[]} seriesNames
 * @param {number} [intervalHours=0] - Interval duration in hours; when > 0, divides each row total to convert MWh → MW
 * @returns {number}
 */
export function peakOutput(rows, seriesNames, intervalHours = 0) {
	let max = 0;
	for (const row of rows) {
		let rowTotal = 0;
		for (const name of seriesNames) {
			const val = row[name];
			if (typeof val === 'number' && val > 0) rowTotal += val;
		}
		if (intervalHours > 0) rowTotal /= intervalHours;
		if (rowTotal > max) max = rowTotal;
	}
	return max;
}

/**
 * CO2 emissions from energy data and per-unit emissions factors.
 * @param {Array<Record<string, any>>} energyData
 * @param {string[]} seriesNames - Energy series names (e.g. 'energy_UNIT1')
 * @param {Record<string, number>} emissionsFactors - unit code → tCO2/MWh
 * @returns {number} Total tonnes CO2
 */
export function totalEmissions(energyData, seriesNames, emissionsFactors) {
	let total = 0;
	for (const name of seriesNames) {
		const unitCode = name.replace(/^energy_/, '');
		const ef = emissionsFactors[unitCode];
		if (ef && ef > 0) {
			total += sumSeries(energyData, name) * ef;
		}
	}
	return total;
}

/**
 * Count running hours: number of intervals where power > 0, converted to hours.
 * @param {Array<Record<string, any>>} powerData
 * @param {string[]} seriesNames - Power series names
 * @param {number} intervalMinutes - Interval duration (e.g. 5 for 5m data)
 * @returns {number} Hours
 */
export function runningHours(powerData, seriesNames, intervalMinutes) {
	let count = 0;
	for (const row of powerData) {
		let generating = false;
		for (const name of seriesNames) {
			const val = row[name];
			if (typeof val === 'number' && val > 0) {
				generating = true;
				break;
			}
		}
		if (generating) count++;
	}
	return (count * intervalMinutes) / 60;
}

/**
 * Count generator start events (transitions from 0 to >0).
 * @param {Array<Record<string, any>>} powerData
 * @param {string[]} seriesNames
 * @returns {number}
 */
export function startCount(powerData, seriesNames) {
	let starts = 0;
	let wasGenerating = false;

	for (const row of powerData) {
		let generating = false;
		for (const name of seriesNames) {
			const val = row[name];
			if (typeof val === 'number' && val > 0) {
				generating = true;
				break;
			}
		}
		if (generating && !wasGenerating) starts++;
		wasGenerating = generating;
	}
	return starts;
}

// ── Battery-specific metrics ────────────────────────────────────────

/**
 * Compute battery-specific metrics by separating charge and discharge series.
 *
 * @param {Object} params
 * @param {Array<Record<string, any>>} params.energyData
 * @param {Array<Record<string, any>>} params.mvData - Market value data
 * @param {string[]} params.generatorSeriesNames - Energy series for discharge units
 * @param {string[]} params.loadSeriesNames - Energy series for charge units
 * @param {string[]} params.mvGeneratorNames - MV series for discharge units
 * @param {string[]} params.mvLoadNames - MV series for charge units
 * @param {number} params.storageCapacity - MWh
 * @param {number} params.powerCapacity - MW (discharge)
 * @param {number} params.hoursInRange
 * @returns {{ netRevenue: number, avgSpread: number, cyclesPerDay: number, storageDuration: number, roundTripEfficiency: number }}
 */
export function batteryMetrics({ energyData, mvData, generatorSeriesNames, loadSeriesNames, mvGeneratorNames, mvLoadNames, storageCapacity, powerCapacity, hoursInRange }) {
	let dischargeEnergy = 0;
	let chargeEnergy = 0;
	let dischargeMV = 0;
	let chargeMV = 0;

	for (const name of generatorSeriesNames) {
		dischargeEnergy += sumSeries(energyData, name);
	}
	for (const name of loadSeriesNames) {
		chargeEnergy += Math.abs(sumSeries(energyData, name));
	}
	for (const name of mvGeneratorNames) {
		dischargeMV += sumSeries(mvData, name);
	}
	for (const name of mvLoadNames) {
		chargeMV += Math.abs(sumSeries(mvData, name));
	}

	const netRevenue = dischargeMV - chargeMV;
	const avgDischargePrice = dischargeEnergy > 0 ? dischargeMV / dischargeEnergy : 0;
	const avgChargePrice = chargeEnergy > 0 ? chargeMV / chargeEnergy : 0;
	const avgSpread = avgDischargePrice - avgChargePrice;

	const days = hoursInRange / 24;
	const cyclesPerDay = storageCapacity > 0 && days > 0
		? dischargeEnergy / storageCapacity / days
		: 0;

	const storageDuration = powerCapacity > 0 ? storageCapacity / powerCapacity : 0;

	const roundTripEfficiency = chargeEnergy > 0
		? (dischargeEnergy / chargeEnergy) * 100
		: 0;

	return { netRevenue, avgSpread, cyclesPerDay, storageDuration, roundTripEfficiency };
}

// ── Solar-specific ──────────────────────────────────────────────────

/**
 * DC:AC ratio for solar farms.
 * capacity_registered = DC array, capacity_maximum = AC connection.
 * @param {number} capacityRegistered - DC capacity (MW)
 * @param {number} capacityMaximum - AC capacity (MW)
 * @returns {number | null} Ratio (e.g. 1.31), or null if not meaningful
 */
export function dcAcRatio(capacityRegistered, capacityMaximum) {
	if (!capacityRegistered || !capacityMaximum || capacityMaximum <= 0) return null;
	const ratio = capacityRegistered / capacityMaximum;
	// Only meaningful if DC > AC (ratio > 1.05 to avoid noise)
	if (ratio < 1.05 || ratio > 3) return null;
	return ratio;
}
