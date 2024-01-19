import { PUBLIC_JSON_API } from '$env/static/public';
import ispData from '$lib/isp';
import energyHistory from '$lib/energy_history';

/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	const { outlookEnergyNem, fuelTechs } = ispData();

	const historyEnergyNemRes = await fetch(`${PUBLIC_JSON_API}/au/NEM/energy/all.json`);
	const { data: jsonData } = await historyEnergyNemRes.json();
	const historyEnergyNemData = energyHistory(jsonData);

	return {
		outlookEnergyNem,
		fuelTechs,
		historyEnergyNemData
	};
}
