export async function load({ fetch }) {
	try {
		const nemWemRecordIds = await fetch('/api/record-ids');
		const nemRegionsRecordIds = await fetch('/api/record-ids?regions=nsw1,qld1,sa1,tas1,vic1');

		if (!nemWemRecordIds.ok) {
			throw new Error(`HTTP error: ${nemWemRecordIds.status}`);
		}
		if (!nemRegionsRecordIds.ok) {
			throw new Error(`HTTP error: ${nemRegionsRecordIds.status}`);
		}

		const nemWemRecordIdsData = await nemWemRecordIds.json();
		const nemRegionsRecordIdsData = await nemRegionsRecordIds.json();

		// return unique record_ids sorted by record_id string
		/** @type {MilestoneRecord[]} */
		const recordIds = [
			...new Set([...nemWemRecordIdsData.data, ...nemRegionsRecordIdsData.data])
		].sort((a, b) => a.record_id.localeCompare(b.record_id));

		return { recordIds };
	} catch (error) {
		console.error(error);
		return { error: 'Unable to fetch record ids' };
	}
}
