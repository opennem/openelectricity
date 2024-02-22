// import outlookEnergyNem from '$lib/isp-data/isp_outlooks/au/NEM/energy/outlook.json';
// import outlookCapacityNem from '$lib/isp-data/isp_outlooks/au/NEM/capacity/outlook.json';
import outlookEnergyNem from '$lib/isp-data/outlooks2024/au/NEM/energy/outlook.json';

function ispData() {
	const data = outlookEnergyNem.data;
	const updatedDataToTera = data.map((d) => {
		const projection = { ...d.projection };
		projection.data = projection.data.map((d) => d / 1000);

		return {
			...d,
			projection
		};
	});

	const pathways = [...new Set(data.map((d) => d.pathway))].sort();
	const scenarios = [...new Set(data.map((d) => d.scenario))].sort();
	const fuelTechs = [...new Set(data.map((d) => d.fuel_tech))].sort();

	return {
		outlookEnergyNem: {
			...outlookEnergyNem,
			data: updatedDataToTera
		},
		pathways,
		scenarios,
		fuelTechs
	};
}

export default ispData;
