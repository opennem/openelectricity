import { error } from '@sveltejs/kit';
import { PUBLIC_JSON_API } from '$env/static/public';

export async function GET({ fetch, setHeaders }) {
	setHeaders({
		'cache-control': 'max-age=1800' // 30 mins
	});

	const res = await fetch(`${PUBLIC_JSON_API}/au/NEM/power/7d.json`);

	if (res.ok) {
		const { data } = await res.json();
		return Response.json(
			data.filter((/** @type {StatsData} */ d) => d.fuel_tech && d.type === 'power')
		);
	}

	error(404, 'Not found');
}
