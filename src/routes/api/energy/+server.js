import { error } from '@sveltejs/kit';
import { PUBLIC_JSON_API } from '$env/static/public';

export async function GET({ fetch, url, setHeaders }) {
	setHeaders({
		'cache-control': 'max-age=604800' // 1 week
	});

	const { searchParams } = url;
	const country = searchParams.get('country') || 'au';
	const network = searchParams.get('network') || 'NEM';
	const region = searchParams.get('region') || '';
	const type = searchParams.get('type') || 'energy';
	const networkRegion = region ? `${network}/${region}` : network;

	const dataPath = `${PUBLIC_JSON_API}/${country}/${networkRegion}/${type}/all.json`;
	console.log('api/energy/', dataPath);

	// const res = await fetch(`${PUBLIC_JSON_API}/au/NEM/energy/all.json`);
	const res = await fetch(dataPath);

	if (res.ok) {
		return Response.json(await res.json());
	}

	error(404, 'Not found');
}
