/**
 *
 * @param {*} scenarioData
 * @returns
 */
export default function (scenarioData) {
	// update to TWh before returning
	const updatedDataToTera = (data) =>
		data.map((d) => {
			const projection = { ...d.projection };
			projection.data = projection.data.map((d) => d / 1000);

			return {
				...d,
				projection
			};
		});

	// grab unique pathways and fuel techs
	const pathways = (data) => [...new Set(data.map((d) => d.pathway))];
	const fuelTechs = (data) => [...new Set(data.map((d) => d.fuel_tech))].sort();

	const dataset = scenarioData?.data || [];

	return {
		data: updatedDataToTera(dataset),
		pathways: pathways(dataset),
		fuelTechs: fuelTechs(dataset)
	};
}
