import { error } from '@sveltejs/kit';
import parseId from './RecordHistory/helpers/parse-id';
import { xTickValueFormatters } from './RecordHistory/helpers/config';

export async function load({ data, params, url }) {
	let id = params.id;

	if (id) {
		let parsed = parseId(id);
		let isWEM = parsed?.network_id === 'wem';
		let timeZone = isWEM ? '+08:00' : '+10:00';
		let formattedDateTime = '';

		if (parsed?.period) {
			const formatX = xTickValueFormatters[parsed?.period].format;
			formattedDateTime = data.focusTime ? formatX(new Date(data.focusTime), timeZone) : '';
		}

		return {
			...data, // pipe through data from PageServer
			...parsed,
			formattedDateTime
		};
	} else {
		error(404, {
			message: 'Record ID not found.'
		});
	}
}
