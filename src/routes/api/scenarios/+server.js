import { error } from '@sveltejs/kit';
import { PUBLIC_JSON_URL } from '$env/static/public';

const basePath = PUBLIC_JSON_URL + '/models';
/** @type {*} */
const modelPaths = {
	aemo2022: '/2022_ISP_final',
	aemo2024: '/2024_ISP_final'
};

export async function GET({ setHeaders, url, fetch }) {
	setHeaders({
		'cache-control': 'max-age=3600' // 5 mins = 300secs
	});

	const { searchParams } = url;
	const name = searchParams.get('name') || '';
	const scenario = searchParams.get('scenario') || '';

	const dataPath = `${basePath}${modelPaths[name]}/${scenario}.json`;

	const res = await fetch(dataPath);
	if (res.ok) {
		return Response.json(await res.json());
	}

	error(404, 'Not found');
}
