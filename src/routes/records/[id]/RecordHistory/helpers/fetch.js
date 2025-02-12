/**
 * Fetch a single record
 * @param {string} recordId
 * @param {number} page
 * @returns {Promise<MilestoneRecord[] | undefined>}
 */
export default async function (recordId, page = 1) {
	let id = encodeURIComponent(recordId);
	let res = await fetch(`/api/records/${id}?page=${page}`);
	let json = await res.json();

	return json.data;
}
