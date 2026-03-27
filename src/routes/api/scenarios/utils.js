/**
 * Filter scenario data array by optional params
 * @param {any[]} data
 * @param {{ pathway?: string, region?: string, dataType?: string }} filters
 * @returns {any[]}
 */
export function filterScenarioData(data, filters) {
	const { pathway, region, dataType } = filters;

	return data.filter((d) => {
		if (pathway && d.pathway !== pathway) return false;
		if (region && d.region.toLowerCase() !== region.toLowerCase()) return false;
		if (dataType && d.type !== dataType) return false;
		return true;
	});
}

/**
 * Normalise emissions values from ktCO2e to tCO2e (multiply by 1000)
 * to match the units expected by the processing pipeline and historical data.
 * Energy and capacity values are left unchanged (already in GWh/MW).
 * @param {any[]} data
 * @returns {any[]}
 */
export function normaliseEmissions(data) {
	return data.map((d) => {
		if (d.type !== 'emissions') return d;

		const projection = { ...d.projection };
		projection.data = projection.data.map((/** @type {number} */ v) => v * 1000);

		return { ...d, projection, units: 'tCO2e' };
	});
}
