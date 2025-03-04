import { error } from '@sveltejs/kit';
import parseId from './RecordHistory/helpers/parse-id';

export async function load({ data, params, url }) {
	const { searchParams } = url;
	const focusTime = searchParams.get('focusTime');

	let id = params.id;

	if (id) {
		let parsed = parseId(id);

		return {
			...data, // pipe through data from PageServer
			...parsed,
			focusTime
		};
	} else {
		error(404, {
			message: 'Record ID not found.'
		});
	}
}
