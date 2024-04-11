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

	const prices = await fetch('/api/prices').then(async (res) => {
		const { data: jsonData } = await res.json();
		const regionPrices = {};
		jsonData.forEach((region) => {
			regionPrices[region.code] = region.history.data[region.history.data.length - 1];
		});
		return {
			regionPrices,
			originalJsons: jsonData
		};
	});

	// const regionPower = await fetch('/api/region-power').then(async (res) => {
	// 	const jsonData = await res.json();
	// 	return jsonData;
	// });

	// const regionEnergy = await fetch('/api/region-energy').then(async (res) => {
	// 	const jsonData = await res.json();
	// 	return jsonData;
	// });

	// const regionEmissions = await fetch('/api/region-emissions').then(async (res) => {
	// 	const jsonData = await res.json();
	// 	return jsonData;
	// });

	return {
		...data, // pipe through data from PageServer

		records,
		flows,
		prices,
		dataTrackerData,
		historyEnergyNemData

		// regionPower,
		// regionEnergy,
		// regionEmissions
	};
}
