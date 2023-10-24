import outlookEnergyNem from './data/isp_outlooks/au/NEM/energy/outlook.json';
import outlookCapacityNem from './data/isp_outlooks/au/NEM/capacity/outlook.json';

/** @type {import('./$types').PageLoad} */
export async function load() {
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
