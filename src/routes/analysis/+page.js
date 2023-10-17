import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity';

/** @type {import('./$types').PageLoad} */
export async function load() {
	const data = await client.fetch(
		`*[_type == "article"]
			{_id, title}`
	);

	console.log(data);

	if (data && data.length > 0) {
		// const items = [];
		// data.map((item) => {
		// 	return { title: item.title };
		// });
		return {
			items: []
		};
	}

	throw error(404, 'Not found');
}
