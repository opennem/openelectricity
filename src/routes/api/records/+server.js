import { error } from '@sveltejs/kit';

export async function GET({ fetch, setHeaders }) {
	setHeaders({
		'cache-control': 'max-age=3600'
	});

	const records = await fetch('/data/records.json');

	if (records && records.ok) {
		const res = Response.json(await records.json());
		return res;
	}

	throw error(404, 'Not found');
}
