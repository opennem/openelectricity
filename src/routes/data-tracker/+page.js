import { PUBLIC_JSON_API } from '$env/static/public';

/** @typedef {import('$lib/types/stats.types').StatsData} StatsData */

/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
	const res = await fetch(`${PUBLIC_JSON_API}/au/NEM/power/7d.json`);
	const json = await res.json();
	const data = json.data;
	const filtered = data.filter((/** @type {StatsData} */ d) => d.fuel_tech);
	const fuelTechs = [...new Set(filtered.map((/** @type {StatsData} */ d) => d.fuel_tech))].sort();

	return {
		version: json.version,
		messages: json.messages,
		network: json.network,
		createdAt: json.created_at,
		data: filtered,
		fuelTechs
	};
}
