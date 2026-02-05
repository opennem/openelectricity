import { error } from '@sveltejs/kit';
import { PUBLIC_JSON_URL } from '$env/static/public';

const basePath = PUBLIC_JSON_URL + '/models';
/** @type {*} */
const modelPaths = {
	aemo2022: '/aemo-isp-2022',
	aemo2024: '/aemo-isp-2024'
};

export async function GET({ setHeaders, url, fetch }) {
	setHeaders({
		'cache-control': 'max-age=300' // 5 mins = 300secs
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
	const name = searchParams.get('name') || 'aemo2024';
	const country = searchParams.get('country') || 'au';
	const network = searchParams.get('network') || 'NEM';
	const type = searchParams.get('type') || 'energy';

	const regions = ['NSW1', 'QLD1', 'VIC1', 'SA1', 'TAS1'];
	const dataPaths = regions.map(
		(region) =>
			`${basePath}${modelPaths[name]}/${country}/${network}/${region}/${type}/outlook.json`
	);

	const res = await fetchAll(dataPaths);
	if (/** @type {any} */ (res).error) {
		error(500, 'Error fetching data');
	}

	return Response.json(res);
}
