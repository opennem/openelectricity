import { error } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ fetch, params }) {
	const data = await fetch('/api/records');

	if (data && data.ok) {
		return {
			records: await data.json()
		};
	}

	throw error(404, 'Not found');
}
