import { error } from '@sveltejs/kit';
import { PUBLIC_JSON_API } from '$env/static/public';

export async function GET({ fetch, url, setHeaders }) {
	setHeaders({
		'cache-control': 'max-age=604800' // 1 week
	});

	/**
	 *
	 * @param {string[]} urls
	 */
	function fetchAll(urls) {
		return Promise.all(
			urls.map((url) =>
				fetch(url)
					.then((r) => r.json())
					.then((data) => data)
					.catch((error) => ({ error, url }))
			)
		);
	}

	const { searchParams } = url;
	const country = searchParams.get('country') || 'au';
	const network = searchParams.get('network') || 'NEM';
	const type = searchParams.get('type') || 'energy';

	const regions = ['NSW1', 'QLD1', 'VIC1', 'SA1', 'TAS1'];
	const dataPaths = regions.map(
		(region) => `${PUBLIC_JSON_API}/${country}/${network}/${region}/${type}/all.json`
	);

	console.log('api/energy/all-regions', dataPaths);

	const res = await fetchAll(dataPaths);
	console.log('api/energy/all-regions', dataPaths, res);

	if (res.error) {
		error(500, 'Error fetching data');
	}

	return Response.json(res);
}
