/** @param {any} outlook */
export default function (outlook) {
	// console.log('outlook', outlook);

	// update to TWh before returning
	const updatedDataToTera = (/** @type {any[]} */ data) =>
		data.map((/** @type {any} */ d) => {
			const projection = { ...d.projection };
			projection.data = projection.data.map((/** @type {number} */ d) => d / 1000);

			return {
				...d,
				projection
			};
		});

	// grab unique pathways, scenarios, and fuel techs
	const pathways = (/** @type {any[]} */ data) => [...new Set(data.map((/** @type {any} */ d) => d.pathway))];
	const scenarios = (/** @type {any[]} */ data) =>
		[...new Set(data.map((/** @type {any} */ d) => d.scenario))].sort().reverse();
	const fuelTechs = (/** @type {any[]} */ data) =>
		[...new Set(data.map((/** @type {any} */ d) => d.fuel_tech))].sort();

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
