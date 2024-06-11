export default function (outlook) {
	// console.log('outlook', outlook);

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

	// grab unique pathways, scenarios, and fuel techs
	const pathways = (data) => [...new Set(data.map((d) => d.pathway))];
	const scenarios = (data) => [...new Set(data.map((d) => d.scenario))].sort().reverse();
	const fuelTechs = (data) => [...new Set(data.map((d) => d.fuel_tech))].sort();

	const outlookData = outlook?.data || [];

	return {
		outlook: {
			...outlook,
			data: updatedDataToTera(outlookData)
		},
		pathways: pathways(outlookData),
		scenarios: scenarios(outlookData),
		fuelTechs: fuelTechs(outlookData)
	};
}
