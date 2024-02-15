import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch, params }) {
	const data = await fetch('/api/records');

	if (data && data.ok) {
		const recordsResponse = await data.json();

		return {
			records: recordsResponse.data
		};
	}

	throw error(404, 'Not found');
}
