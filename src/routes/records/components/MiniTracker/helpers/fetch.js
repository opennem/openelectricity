/**
 * @param {string} dataPath
 * @returns {Promise<StatsData[] | undefined>}
 */
export default async function (dataPath) {
	let res = await fetch(`/api/energy?${dataPath}`);
	let json = await res.json();
	return json.data;
}
