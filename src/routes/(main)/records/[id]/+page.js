import { error } from '@sveltejs/kit';
import { xTickValueFormatters } from './RecordHistory/helpers/config';
// import parseId from './RecordHistory/helpers/parse-id';
export async function load({ data, params, fetch }) {
	let id = params.id;

	if (id) {
		let res = await fetch(`/api/records/${id}?pageSize=1`);
		let jsonData = await res.json();

		let returnedData = {};

		if (jsonData.success && jsonData.total_records > 0) {
			let firstRecord = /** @type {MilestoneRecord} */ (jsonData.data[0]);
			let isWEM = firstRecord.network_id === 'WEM';
			let timeZone = isWEM ? '+08:00' : '+10:00';
			let period = firstRecord.period;

			const formatX = xTickValueFormatters[period].format;
			let formattedDateTime = data.focusTime
				? formatX(new Date(data.focusTime), timeZone)
				: formatX(new Date(/** @type {string} */ (firstRecord.interval)), timeZone);
			returnedData = {
				...firstRecord,
				formattedDateTime
			};

			return {
				...data, // pipe through data from PageServer
				...returnedData
			};
		}
	}

	error(404, {
		message: 'Record ID ' + id + ' not found'
	});
}
