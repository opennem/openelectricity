import { PUBLIC_JSON_API } from '$env/static/public';
import energyHistory from '$lib/energy_history';

/** @type {import('./$types').PageLoad} */
export async function load({ data, fetch }) {
	const dataTrackerData = await fetch(`${PUBLIC_JSON_API}/au/NEM/power/7d.json`).then(
		async (res) => {
			const { data: jsonData } = await res.json();
			return jsonData.filter((/** @type {StatsData} */ d) => d.fuel_tech && d.type === 'power');
		}
	);

	const historyEnergyNemData = await fetch(`${PUBLIC_JSON_API}/au/NEM/energy/all.json`).then(
		async (res) => {
			const { data: jsonData } = await res.json();
			return energyHistory(jsonData);
		}
	);

	const records = await fetch('/api/records').then(async (res) => {
		const { data: jsonData } = await res.json();
		return jsonData;
	});

	return {
		...data, // pipe through data from PageServer

		records,
		dataTrackerData,
		historyEnergyNemData
	};
}
