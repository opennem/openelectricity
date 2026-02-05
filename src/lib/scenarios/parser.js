/**
 *
 * @param {*} scenarioData
 * @returns
 */
export default function (scenarioData) {
	// update to TWh before returning
	const updatedDataToTera = (/** @type {any[]} */ data) =>
		data.map((/** @type {any} */ d) => {
			const isTypeEmissions = d.type === 'emissions';
			const projection = { ...d.projection };
			projection.data = isTypeEmissions
				? projection.data.map((/** @type {number} */ d) => d)
				: projection.data.map((/** @type {number} */ d) => d / 1000);

			return {
				...d,
				projection
			};
		});

	// grab unique pathways and fuel techs
	const pathways = (/** @type {any[]} */ data) => [...new Set(data.map((/** @type {any} */ d) => d.pathway))];
	const fuelTechs = (/** @type {any[]} */ data) =>
		[...new Set(data.map((/** @type {any} */ d) => d.fuel_tech))].sort();

	const dataset = scenarioData?.data || [];

	return {
		data: updatedDataToTera(dataset),
		pathways: pathways(dataset),
		fuelTechs: fuelTechs(dataset)
	};
}
