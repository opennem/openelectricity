/**
 * @param {string} dataPath
 * @returns {Promise<StatsData[] | undefined>}
 */
async function fetchEnergyData(dataPath) {
	// `/api/oe/?region=NEM&interval=5m&primary_grouping=network`;

	let res = await fetch(`/api/energy?${dataPath}`);
	let json = await res.json();
	return json.data;
}

async function fetchOEData() {
	let res = await fetch(`/api/oe/?region=NEM&interval=5m&primary_grouping=network`);
	let json = await res.json();
	return json.data;
}

export { fetchEnergyData, fetchOEData };
