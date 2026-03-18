/**
 * Parse scenario API response, extracting unique pathways and fuel techs
 * @param {*} scenarioData
 * @returns {{ data: any[], pathways: string[], fuelTechs: string[] }}
 */
export default function (scenarioData) {
	const dataset = scenarioData?.data || [];

	return {
		data: dataset,
		pathways: [...new Set(dataset.map((/** @type {any} */ d) => d.pathway))],
		fuelTechs: [...new Set(dataset.map((/** @type {any} */ d) => d.fuel_tech))].sort()
	};
}
