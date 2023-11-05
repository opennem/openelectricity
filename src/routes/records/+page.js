import { PUBLIC_RECORDS_API } from '$env/static/public';

import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity';

/** @type {import('./$types').PageLoad} */
export async function load({ fetch, params }) {
	const data = await fetch(PUBLIC_RECORDS_API);

	if (data && data.ok) {
		return {
			records: await data.json()
		};
	}

	throw error(404, 'Not found');
}
