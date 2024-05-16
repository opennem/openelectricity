import parser from '$lib/models/parser.js';

/** @type {import('./$types').PageLoad} */
export async function load({ data, fetch }) {
	const dataTrackerData = await fetch('/api/power').then(async (res) => {
		const jsonData = await res.json();
		return jsonData;
	});

	const historyEnergyNemData = await fetch('/api/energy').then(async (res) => {
		const jsonData = await res.json();
		return jsonData;
	});

	// const modelsData = await fetch('/api/models').then(async (res) => {
	// 	const jsonData = parser(await res.json());
	// 	return jsonData;
	// });

	return {
		...data, // pipe through data from PageServer

		dataTrackerData,
		historyEnergyNemData
		// modelsData
	};
}
