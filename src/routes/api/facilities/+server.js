import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity';
import { byProp } from '$lib/utils/sort';

export async function GET({ setHeaders }) {
	setHeaders({
		'cache-control': 'max-age=3600'
	});

	const facilities = await client.fetch(`*[_type == "facility"]{_id, name, code}`);

	if (facilities) {
		const res = Response.json(facilities.sort(byProp('name')));
		return res;
	}
	error(404, 'Not found');
}
