import ispData from '$lib/isp';

/** @type {import('./$types').PageLoad} */
export async function load() {
	const { outlookEnergyNem, pathways, scenarios, fuelTechs } = ispData();
	return {
		outlookEnergyNem,
		pathways,
		scenarios,
		fuelTechs
	};
}
