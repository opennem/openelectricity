import { PUBLIC_JSON_API } from '$env/static/public';
import energyHistory from '$lib/energy_history';

/** @type {import('./$types').PageLoad} */
export async function load({ data, fetch }) {
	const dataTrackerRes = await fetch(`${PUBLIC_JSON_API}/au/NEM/power/7d.json`);
	const { data: dataTrackerJson } = await dataTrackerRes.json();
	const dataTrackerData = dataTrackerJson.filter(
		(/** @type {StatsData} */ d) => d.fuel_tech && d.type === 'power'
	);

	const historyEnergyNemRes = await fetch(`${PUBLIC_JSON_API}/au/NEM/energy/all.json`);
	const { data: jsonData } = await historyEnergyNemRes.json();
	const historyEnergyNemData = energyHistory(jsonData);

	const recordsRes = await fetch('/api/records');
	let records = [];

	if (recordsRes && recordsRes.ok) {
		const recordsResponse = await recordsRes.json();
		records = recordsResponse.data;
	}

	return {
		...data,

		records,

		dataTrackerData,
		historyEnergyNemData
	};
}
