/**
 * @param {string} region
 * @param {string} range
 */
export default async function fetchData(region, range) {
	const apiRange = range === '12-month-rolling' ? 'monthly' : range;
	const res = await fetch(`/api/ember-bridge/?region=${region}&range=${apiRange}`);
	const json = await res.json();
	return json.data;
}
