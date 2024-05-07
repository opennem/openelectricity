import { endOfDay, startOfDay, format, nextDay, addDays } from 'date-fns';
import { PUBLIC_RECORDS_API, PUBLIC_API_KEY } from '$env/static/public';

export async function GET({ url, fetch, setHeaders }) {
	setHeaders({
		'cache-control': 'max-age=1800', // 30 mins
		Authorization: `Bearer ${PUBLIC_API_KEY}`
	});

	const date = url.searchParams.get('date');
	const pageNum = url.searchParams.get('page');
	let dateParams = '';
	let pageParams = '';

	const f = 'yyyy-MM-dd';

	if (date) {
		dateParams = `&date_start=${date}&date_end=${format(addDays(new Date(date), 1), f)}`;
	}

	if (pageNum) {
		pageParams = `&page=${pageNum}`;
	}

	const response = await fetch(`${PUBLIC_RECORDS_API}?limit=10${dateParams}${pageParams}`);

	if (response.ok) {
		const data = await response.json();
		return Response.json(data);
	}

	return Response.json({ error: 'Error reading from milestones API.' }, { status: 500 });
}
