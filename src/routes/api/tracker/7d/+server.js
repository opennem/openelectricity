import { error } from '@sveltejs/kit';
import { PUBLIC_JSON_API } from '$env/static/public';

export async function GET({ fetch, url }) {
	let { searchParams } = url;
	let regionPath = searchParams.get('regionPath') || 'au/NEM';

	let res = await fetch(`${PUBLIC_JSON_API}/${regionPath}/power/7d.json`);

	if (res.ok) {
		let data = await res.json();
		return Response.json(data);
	}

	error(404, 'Not found');
}
