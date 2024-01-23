// import outlookEnergyNem from '$lib/isp-data/isp_outlooks/au/NEM/energy/outlook.json';
// import outlookCapacityNem from '$lib/isp-data/isp_outlooks/au/NEM/capacity/outlook.json';
import outlookEnergyNem from '$lib/isp-data/outlooks2024/au/NEM/energy/outlook.json';

function ispData() {
	const data = outlookEnergyNem.data;
	const pathways = [...new Set(data.map((d) => d.pathway))].sort();
	const scenarios = [...new Set(data.map((d) => d.scenario))].sort();
	const fuelTechs = [...new Set(data.map((d) => d.fuel_tech))].sort();

	return {
		outlookEnergyNem,
		pathways,
		scenarios,
		fuelTechs
	};
}

export default ispData;
