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

	const { searchParams } = url;
	const name = searchParams.get('name') || 'aemo2024';
	const country = searchParams.get('country') || 'au';
	const network = searchParams.get('network') || 'NEM';
	const region = searchParams.get('region') || '';
	const type = searchParams.get('type') || 'energy';
	const networkRegion = region ? `${network}/${region}` : network;

	const dataPath = `${basePath}${modelPaths[name]}/${country}/${networkRegion}/${type}/outlook.json`;

	const res = await fetch(dataPath);
	if (res.ok) {
		return Response.json(await res.json());
	}

	error(404, 'Not found');
}
