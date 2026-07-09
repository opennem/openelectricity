/**
 * price-lines.js — direction-decomposed derived price for facility charts.
 *
 * The facility "price" is a volume-weighted average: Σ market_value / Σ energy
 * over the visible units. That division is only meaningful while the numerator
 * and denominator describe flow in ONE direction. Facilities with storage break
 * the naive facility-wide version: a battery's daily net energy is usually
 * negative (round-trip losses mean charge > discharge), so netted totals mix
 * revenue with cost and produce either a null or a bogus negative price.
 *
 * The rule implemented here: partition the unit set into the generation side
 * and the load side (`loadFuelTechs` — battery charging, pumps, etc.), and
 * derive an independent price line for each:
 *
 * - `price` (generation side): Σ mv(gen) / Σ energy(gen), valid while the
 *   energy is positive. For a plain generator facility this is identical to
 *   the old facility-wide calculation.
 * - `loadPrice` (load side): load series arrive sign-inverted from
 *   `processFacilityPower` (`loadsToInvert`), so both totals are negative and
 *   the ratio is the volume-weighted price PAID — valid while the (inverted)
 *   energy is negative. It is legitimately negative when the unit was paid to
 *   consume (negative spot prices while charging/pumping).
 *
 * Shapes this covers:
 * - Battery, split view: `battery_discharging` → `price`, `battery_charging`
 *   → `loadPrice` (the arbitrage spread is the gap between the lines).
 * - Battery, net view: the bidirectional `battery` unit cannot be decomposed
 *   row-by-row at daily+ grains, so callers should pass the SPLIT unit set for
 *   pricing (see FacilityFinancialDataProvider's `priceFacility`).
 * - Mixed fuel techs + battery (e.g. solar + storage): solar and discharging
 *   sit on the generation side; charging on the load side.
 * - Pumped hydro: `pumps` units are loads, so pumping cost gets its own line
 *   next to the generation price.
 * - All-load unit sets (the charging-side unit slide-out): the generation line
 *   never validates and only `loadPrice` renders.
 */

import { unitSeriesIds } from './unit-analysis.js';
import { buildEnergyMap, sumSeries } from './energy-basis.js';

/**
 * Partition metric-prefixed series names into generation / load sides.
 *
 * @param {string[]} seriesNames - e.g. ['energy_U1', 'energy_U2']
 * @param {string} metric - the prefix the names carry ('market_value', 'energy', 'power')
 * @param {string[]} loadCodes - bare load unit codes from analyzeUnits
 * @returns {{ gen: string[], load: string[] }}
 */
export function partitionSeriesByDirection(seriesNames, metric, loadCodes) {
	const loadIds = new Set(unitSeriesIds(metric, loadCodes));
	/** @type {{ gen: string[], load: string[] }} */
	const sides = { gen: [], load: [] };
	for (const name of seriesNames) {
		(loadIds.has(name) ? sides.load : sides.gen).push(name);
	}
	return sides;
}

/**
 * Derive the per-direction price rows from display-aggregated market-value and
 * basis (power/energy) rows. Row alignment is by `time` — the two row sets come
 * from managers fetching the same interval, so timestamps match.
 *
 * @param {Object} opts
 * @param {any[]} opts.mvRows - display-aggregated market-value rows
 * @param {string[]} opts.mvSeriesNames - `market_value_<unit>` series ids
 * @param {any[]} opts.basisRows - display-aggregated basis rows
 * @param {string[]} opts.basisSeriesNames - `power_<unit>` or `energy_<unit>` ids
 * @param {'power' | 'energy'} opts.basisMetric - prefix the basis names carry
 * @param {string[]} opts.loadCodes - bare load unit codes for the pricing unit set
 * @param {import('./energy-basis.js').BasisContext} opts.energyOpts - MWh conversion context
 * @returns {{ date: any, time: number, price: number | null, loadPrice: number | null }[]}
 */
export function derivePriceRows({
	mvRows,
	mvSeriesNames,
	basisRows,
	basisSeriesNames,
	basisMetric,
	loadCodes,
	energyOpts
}) {
	const mvSides = partitionSeriesByDirection(mvSeriesNames, 'market_value', loadCodes);
	const basisSides = partitionSeriesByDirection(basisSeriesNames, basisMetric, loadCodes);

	const genEnergy = buildEnergyMap(basisRows, basisSides.gen, energyOpts);
	// Plain generators have no load side — skip its rows pass entirely.
	const loadEnergy = basisSides.load.length
		? buildEnergyMap(basisRows, basisSides.load, energyOpts)
		: null;

	return mvRows.map((row) => {
		const genE = genEnergy.get(row.time) ?? 0;

		// Load price: the inverted load side is valid only with negative volume;
		// −mv / −energy recovers the positive price paid (negative when paid to
		// consume).
		let loadPrice = null;
		if (loadEnergy) {
			const loadE = loadEnergy.get(row.time) ?? 0;
			if (loadE < 0) loadPrice = sumSeries(row, mvSides.load) / loadE;
		}

		return {
			date: row.date,
			time: row.time,
			// Generation price: valid only with positive volume. `0` (idle) and
			// negative (a net-signed bidirectional unit while charging) are nulled —
			// there is no generated MWh to weight the price by.
			price: genE > 0 ? sumSeries(row, mvSides.gen) / genE : null,
			loadPrice
		};
	});
}

/**
 * Label for the generation-side price line when it renders next to a load
 * line — "Discharge" when the generation side is purely battery discharge.
 * (Without a load line the provider keeps the historical single-line
 * "Av. Price" label instead.)
 *
 * @param {string[]} genFuelTechs - fuel techs of the generation-side units
 * @returns {string}
 */
export function genPriceLabel(genFuelTechs) {
	const allDischarge =
		genFuelTechs.length > 0 && genFuelTechs.every((ft) => ft.includes('discharging'));
	return allDischarge ? 'Discharge price' : 'Generation price';
}

/**
 * Label for the load-side price line, specialised by what the loads are:
 * battery charging variants → "Charge price", pumped-hydro pumps → "Pumping
 * price", anything mixed → "Load price".
 *
 * @param {string[]} loadFuelTechs - fuel techs of the load-side units
 * @returns {string}
 */
export function loadPriceLabel(loadFuelTechs) {
	const allCharging =
		loadFuelTechs.length > 0 && loadFuelTechs.every((ft) => ft.includes('charging'));
	if (allCharging) return 'Charge price';
	const allPumps = loadFuelTechs.length > 0 && loadFuelTechs.every((ft) => ft === 'pumps');
	if (allPumps) return 'Pumping price';
	return 'Load price';
}
