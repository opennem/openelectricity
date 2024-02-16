import { endOfDay, startOfDay, format, nextDay, addDays } from 'date-fns';

export async function GET(request) {
	const date = request.url.searchParams.get('date');
	let dateParams = '';
	const f = 'yyyy-MM-dd';

	if (date) {
		dateParams = `&date_start=${date}&date_end=${format(addDays(new Date(date), 1), f)}`;
	}

	console.log(`https://api.dev.opennem.org.au/v4/milestones/?limit=100${dateParams}`);

	const response = await fetch(
		`https://api.dev.opennem.org.au/v4/milestones/?limit=100${dateParams}`
	);

	if (response.ok) {
		const data = await response.json();
		return Response.json(data);
	}

	return Response.json({ error: 'Error reading from milestones API.' }, { status: 500 });
}
