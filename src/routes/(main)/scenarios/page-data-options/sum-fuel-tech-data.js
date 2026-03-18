/**
 * Fast path for computing a summed total from raw StatsData[].
 * Directly sums fuel tech data arrays, bypassing the expensive
 * Statistic → deepCopy → invertValues → group → reorder → structuredClone pipeline.
 *
 * @param {StatsData[]} data - Raw fuel tech data
 * @param {string} statsType - 'projection' or 'history'
 * @param {Object.<string, string[]>} groupMap - Fuel tech group mapping
 * @param {{
 *   negateFuelTechs?: string[],
 *   excludeGroups?: string[],
 *   id?: string,
 *   label?: string,
 *   colour?: string
 * }} [options]
 * @returns {StatsData | null}
 */
export default function sumFuelTechData(data, statsType, groupMap, options = {}) {
	const { negateFuelTechs = [], excludeGroups = [], id, label, colour } = options;

	// Collect all fuel techs to include (O(groups × codes))
	const includedFuelTechs = new Set();
	for (const [groupKey, codes] of Object.entries(groupMap)) {
		if (excludeGroups.includes(groupKey)) continue;
		for (const code of codes) {
			includedFuelTechs.add(code);
		}
	}

	// Build negate set for O(1) lookup
	const negateSet = new Set(negateFuelTechs);

	// Filter to relevant data entries
	const relevant = data.filter((d) => d.fuel_tech && includedFuelTechs.has(d.fuel_tech));
	if (relevant.length === 0) return null;

	const template = relevant[0];
	const statsData = template[statsType];
	if (!statsData?.data) return null;

	const dataLength = statsData.data.length;
	const summed = new Array(dataLength).fill(0);

	for (const d of relevant) {
		const shouldNegate = negateSet.has(d.fuel_tech);
		const values = d[statsType].data;
		for (let i = 0; i < dataLength; i++) {
			const v = values[i];
			if (v != null) {
				summed[i] += shouldNegate ? -v : v;
			}
		}
	}

	// Return a StatsData-shaped object without deep cloning
	return {
		id: id || template.id,
		code: null,
		fuel_tech: null,
		label: label || template.label,
		colour: colour || template.colour || '#999',
		type: template.type,
		units: template.units,
		[statsType]: {
			...statsData,
			data: summed
		}
	};
}
