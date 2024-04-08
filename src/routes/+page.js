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

	const records = await fetch('/api/records').then(async (res) => {
		const { data: jsonData } = await res.json();
		return jsonData;
	});

	const flows = await fetch('/api/flows').then(async (res) => {
		const { data: jsonData } = await res.json();
		const regionFlows = {};
		jsonData.forEach((region) => {
			regionFlows[region.code] = region.history.data[region.history.data.length - 1];
		});

		return {
			dispatchDateTimeString: jsonData[0].history.last,
			regionFlows,
			originalJsons: jsonData
		};
	});

	return {
		...data, // pipe through data from PageServer

		records,
		flows,
		dataTrackerData,
		historyEnergyNemData
	};
}
