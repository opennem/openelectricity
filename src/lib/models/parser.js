export default function (outlook) {
	const data = outlook.data;

	// update to TWh before returning
	const updatedDataToTera = data.map((d) => {
		const projection = { ...d.projection };
		projection.data = projection.data.map((d) => d / 1000);

		return {
			...d,
			projection
		};
	});

	// grab unique pathways, scenarios, and fuel techs
	const pathways = [...new Set(data.map((d) => d.pathway))].sort();
	const scenarios = [...new Set(data.map((d) => d.scenario))].sort().reverse();
	const fuelTechs = [...new Set(data.map((d) => d.fuel_tech))].sort();

	return {
		outlook: {
			...outlook,
			data: updatedDataToTera
		},
		pathways,
		scenarios,
		fuelTechs
	};
}
