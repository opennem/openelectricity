import { error } from '@sveltejs/kit';
import { PUBLIC_JSON_URL } from '$env/static/public';

const basePath = PUBLIC_JSON_URL + '/capacity';

export async function GET({ setHeaders, url, fetch }) {
	setHeaders({
		'cache-control': 'max-age=604800' // 1 week
	});
	const { searchParams } = url;

	const region =
		searchParams.get('region') === '_all' ? '' : searchParams.get('region')?.toUpperCase() || '';

	console.log('api/capacity/', region);
	const dataPath = `${basePath}/unified_annual_capacity.json`;

	const res = await fetch(dataPath);
	if (res.ok) {
		const jsonData = await res.json();

		// return Response.json(data);

		if (region) {
			return Response.json(
				jsonData.data.filter((/** @type {StatsData} */ d) => d.region === region)
			);
		}

		return Response.json(
			jsonData.data.filter((/** @type {StatsData} */ d) => !d.region && d.network === 'nem')
		);
	}

	error(404, 'Not found');
}
