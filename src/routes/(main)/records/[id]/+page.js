import { error } from '@sveltejs/kit';
import parseId from './RecordHistory/helpers/parse-id';

export async function load({ data, params, url }) {
	const { searchParams } = url;
	// const focusDateTime = searchParams.get('focusDateTime');

	let id = params.id;

	if (id) {
		let parsed = parseId(id);

		return {
			...data, // pipe through data from PageServer
			...parsed
		};
	} else {
		error(404, {
			message: 'Record ID not found.'
		});
	}
}
