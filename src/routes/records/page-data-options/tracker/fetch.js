/**
 * @param {*} record
 * @returns {Promise<StatsData[] | undefined>}
 */
export default async function (record) {
	console.log('record', record);
	if (!record) return;

	const { network_id, network_region, metric, interval, period } = record;
	let isPeriodDay = period === 'day';

	// get first 4 characters of interval
	let year = interval.slice(0, 4);
	let yearParam = isPeriodDay ? `&year=${year}` : '';
	let regionParam = network_region ? `&region=${network_region}` : '';

	// API only supports type energy and power.
	//  - Fetch those first and the other metrics that are inside the dataset
	//  - TODO: also use Period to check which api type to call
	let typeParam = metric && (metric === 'power' || metric === 'energy') ? `&type=${metric}` : '';
	let dataPath = `network=${network_id}${typeParam}${regionParam}${yearParam}`;

	const res = await fetch(`/api/energy?${dataPath}`);
	const json = await res.json();
	return json.data;
}
