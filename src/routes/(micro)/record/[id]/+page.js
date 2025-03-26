import { error } from '@sveltejs/kit';
import parseId from '../../../(main)/records/[id]/RecordHistory/helpers/parse-id';

export async function load({ params }) {
	let id = params.id;

	if (id) {
		let parsed = parseId(id);

		return {
			...parsed
		};
	} else {
		error(404, {
			message: 'Record ID not found.'
		});
	}
}
