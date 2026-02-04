import { PUBLIC_RECORDS_API, PUBLIC_API_KEY } from '$env/static/public';
import { fetchPinnedRecords } from '$lib/records/pinned-records.js';

export async function GET({ fetch, url, setHeaders }) {
	setHeaders({
		'cache-control': 'max-age=300'
	});

	const regionsParam = url.searchParams.get('regions');
	const regionValues = regionsParam ? regionsParam.split(',').filter(Boolean) : undefined;

	try {
		const data = await fetchPinnedRecords(fetch, PUBLIC_RECORDS_API, PUBLIC_API_KEY, regionValues);
		return Response.json(data);
	} catch {
		return Response.json({ error: 'Failed to fetch notable records' }, { status: 500 });
	}
}
