export async function GET(request) {
	const response = await fetch('https://api.dev.opennem.org.au/v4/milestones/?limit=100');
	if (response.ok) {
		const data = await response.json();
		return Response.json(data);
	}

	return Response.json({ error: 'Error reading from milestones API.' }, { status: 500 });
}
