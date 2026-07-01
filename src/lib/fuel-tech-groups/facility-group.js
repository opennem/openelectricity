/**
 * Broad fuel-tech grouping for the fuel-tech-aware facility views — the studio
 * metrics panels and the facility unit detail slide-out. Classifies a single
 * fuel tech code into one of six recognised groups (plus `other`).
 */

/** @typedef {'wind' | 'solar' | 'battery' | 'coal' | 'gas' | 'hydro' | 'other'} FuelTechGroup */

/**
 * Map a single fuel tech code to its broad group.
 * @param {string} ftCode
 * @returns {FuelTechGroup}
 */
export function fuelTechToGroup(ftCode) {
	if (!ftCode) return 'other';
	if (ftCode === 'wind' || ftCode === 'wind_offshore') return 'wind';
	if (ftCode.startsWith('solar')) return 'solar';
	if (ftCode === 'battery' || ftCode === 'battery_charging' || ftCode === 'battery_discharging')
		return 'battery';
	if (ftCode.startsWith('coal')) return 'coal';
	if (ftCode.startsWith('gas') || ftCode === 'distillate') return 'gas';
	if (ftCode === 'hydro' || ftCode === 'pumps') return 'hydro';
	return 'other';
}
