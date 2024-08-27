import { PUBLIC_RECORDS_API, PUBLIC_API_KEY } from '$env/static/public';

export async function GET({ url, fetch, setHeaders }) {
	setHeaders({
		'cache-control': 'max-age=0',
		Authorization: `Bearer ${PUBLIC_API_KEY}`
	});

	const { searchParams } = url;
	const page = searchParams.get('page');
	let pageParams = '';

	if (page) {
		pageParams = `&page=${page}`;
	}

	const path = `${PUBLIC_RECORDS_API}/record_ids`;

	console.log('path', path);

	const response = await fetch(path);

	// console.log('response', response);
	if (response.ok) {
		const data = await response.json();
		return Response.json(data);
	}

	return Response.json({ error: 'Error reading from milestones API.' }, { status: 500 });
}
