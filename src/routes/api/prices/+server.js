import { PUBLIC_PRICE_API } from '$env/static/public';

export async function GET({ fetch, setHeaders }) {
	// setHeaders({
	// 	'cache-control': 'max-age=0' // 5 mins = 300secs
	// });

	const response = await fetch(`${PUBLIC_PRICE_API}/nem`);

	if (response.ok) {
		const data = await response.json();
		return Response.json(data);
	}

	return Response.json({ error: 'Error reading from price API.' }, { status: 500 });
}
