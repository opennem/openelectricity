import { PUBLIC_OE_API_URL, PUBLIC_OE_API_KEY } from '$env/static/public';

export async function GET({ params, url, fetch, setHeaders }) {
	setHeaders({
		'cache-control': 'max-age=0',
		Authorization: `Bearer ${PUBLIC_OE_API_KEY}`
	});

	const { searchParams } = url;
	const networkId = params.network_id;
	const code = params.code;
	const period = searchParams.get('period') || '7d';

	const path = `${PUBLIC_OE_API_URL}/stats/power/station/${networkId}/${code}?period=${period}&with_clerk=true`;

	console.log('path', path);
	// https://api.openelectricity.org.au/v4/stats/power/station/NEM/ARWF?period=7d

	const response = await fetch(path);
	console.log('response', response);
	if (response.ok) {
		const data = await response.json();
		return Response.json(data);
	}

	return Response.json({ error: 'Error reading from open electricity API.' }, { status: 200 });
}
