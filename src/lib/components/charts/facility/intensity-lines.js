/**
 * intensity-lines.js — derived emissions intensity for facility charts.
 *
 * The facility "intensity" is a single facility-wide measure:
 * Σ emissions / Σ energy over the visible units. Emissions arrive in tonnes
 * CO₂e and energy in MWh, so the ratio is scaled ×1000 to the conventional
 * kgCO₂e/MWh. Unlike the price lines there is no direction decomposition —
 * emissions are only ever produced, never "consumed", so one line covers the
 * whole unit set.
 *
 * Row alignment is by `time` via the energy map — the two row sets come from
 * managers fetching the same interval, so timestamps match. Rows without
 * positive energy (idle intervals, or a net-charging storage row) are nulled:
 * there is no generated MWh to attribute the emissions to.
 */

import { buildEnergyMap, sumSeries } from './energy-basis.js';

/**
 * The intensity convention shared by the facility and network derivations:
 * tonnes → kg (×1000) over MWh, null when there is no generated energy to
 * attribute the emissions to.
 * @param {number | null} emissionsTonnes
 * @param {number} energyMWh
 * @returns {number | null}
 */
export function intensityKgPerMWh(emissionsTonnes, energyMWh) {
	return emissionsTonnes !== null && energyMWh > 0 ? (emissionsTonnes * 1000) / energyMWh : null;
}

/**
 * Derive the intensity rows from display-aggregated emissions and basis
 * (power/energy) rows.
 *
 * @param {Object} opts
 * @param {any[]} opts.emissionsRows - display-aggregated emissions rows (tonnes CO₂e)
 * @param {string[]} opts.emissionsSeriesNames - `emissions_<unit>` series ids
 * @param {any[]} opts.basisRows - display-aggregated basis rows
 * @param {string[]} opts.basisSeriesNames - `power_<unit>` or `energy_<unit>` ids
 * @param {import('./energy-basis.js').BasisContext} opts.energyOpts - MWh conversion context
 * @returns {{ date: any, time: number, intensity: number | null }[]}
 */
export function deriveIntensityRows({
	emissionsRows,
	emissionsSeriesNames,
	basisRows,
	basisSeriesNames,
	energyOpts
}) {
	const energyMap = buildEnergyMap(basisRows, basisSeriesNames, energyOpts);

	return emissionsRows.map((row) => {
		const emissionsTotal = sumSeries(row, emissionsSeriesNames); // tonnes CO₂e
		const energyMWh = energyMap.get(row.time) ?? 0;
		return {
			date: row.date,
			time: row.time,
			intensity: intensityKgPerMWh(emissionsTotal, energyMWh)
		};
	});
}
