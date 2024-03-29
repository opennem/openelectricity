import { PUBLIC_JSON_API } from '$env/static/public';
import energyHistory from '$lib/energy_history';

/** @type {import('./$types').PageLoad} */
export async function load({ data, fetch }) {
	/** @return {Promise<*>} */
	const dataTrackerData = async () => {
		const dataTrackerRes = await fetch(`${PUBLIC_JSON_API}/au/NEM/power/7d.json`);
		const { data: dataTrackerJson } = await dataTrackerRes.json();
		return dataTrackerJson.filter(
			(/** @type {StatsData} */ d) => d.fuel_tech && d.type === 'power'
		);
	};

	/** @return {Promise<*>} */
	const historyEnergyNemData = async () => {
		const res = await fetch(`${PUBLIC_JSON_API}/au/NEM/energy/all.json`);
		const { data: jsonData } = await res.json();
		const json = energyHistory(jsonData);
		return json;
	};

	/** @return {Promise<*>} */
	const records = async () => {
		const recordsRes = await fetch('/api/records');

		if (recordsRes && recordsRes.ok) {
			const recordsResponse = await recordsRes.json();
			return recordsResponse.data;
		}
		return [];
	};

	return {
		...data, // pipe through data from PageServer

		records: records(),
		dataTrackerData: dataTrackerData(),
		historyEnergyNemData: historyEnergyNemData()
	};
}
