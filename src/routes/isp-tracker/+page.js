import { PUBLIC_JSON_API } from '$env/static/public';
import energyHistory from '$lib/energy_history';

/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	const historyEnergyNemRes = await fetch(`${PUBLIC_JSON_API}/au/NEM/energy/all.json`);
	const { data: jsonData } = await historyEnergyNemRes.json();
	const historyEnergyNemData = energyHistory(jsonData);

	return {
		historyEnergyNemData
	};
}
