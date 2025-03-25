// import parser from '$lib/models/parser.js';
import energyParser from '$lib/opennem/parser.js';

/** @type {import('./$types').PageLoad} */
export async function load({ data, fetch }) {
	const historyEnergyNemData = await fetch('/api/energy').then(async (res) => {
		const jsonData = await res.json();
		return energyParser(jsonData.data);
	});

	// const modelsData = await fetch('/api/models').then(async (res) => {
	// 	const jsonData = parser(await res.json());
	// 	return jsonData;
	// });

	return {
		...data, // pipe through data from PageServer

		historyEnergyNemData
		// modelsData
	};
}
