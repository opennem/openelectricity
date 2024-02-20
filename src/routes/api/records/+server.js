import { endOfDay, startOfDay, format, nextDay, addDays } from 'date-fns';

export async function GET(request) {
	const date = request.url.searchParams.get('date');
	const pageNum = request.url.searchParams.get('page');
	let dateParams = '';
	let pageParams = '';

	const f = 'yyyy-MM-dd';

	if (date) {
		dateParams = `&date_start=${date}&date_end=${format(addDays(new Date(date), 1), f)}`;
	}

	if (pageNum) {
		pageParams = `&page=${pageNum}`;
	}

	console.log(`https://api.dev.opennem.org.au/v4/milestones/?limit=10${dateParams}${pageParams}`);

	const response = await fetch(
		`https://api.dev.opennem.org.au/v4/milestones/?limit=10${dateParams}${pageParams}`
	);

	if (response.ok) {
		const data = await response.json();
		return Response.json(data);
	}

	return Response.json({ error: 'Error reading from milestones API.' }, { status: 500 });
}
