import { error } from '@sveltejs/kit';
import { PUBLIC_JSON_API } from '$env/static/public';

export async function GET({ fetch, url }) {
	const { searchParams } = url;
	const country = searchParams.get('country') || 'au';
	const network = searchParams.get('network') ? searchParams.get('network')?.toUpperCase() : 'NEM';
	const region =
		searchParams.get('region') === '_all' ? '' : searchParams.get('region')?.toUpperCase() || '';
	const type = searchParams.get('type') || 'energy';
	const networkRegion = region ? `${network}/${region}` : network;
	const year = searchParams.get('year') || 'all';

	const dataPath = `${PUBLIC_JSON_API}/${country}/${networkRegion}/${type}/${year}.json`;
	console.log('api/energy/', dataPath);

	// const res = await fetch(`${PUBLIC_JSON_API}/au/NEM/energy/all.json`);
	const res = await fetch(dataPath);

	if (res.ok) {
		return Response.json(await res.json());
	}

	error(404, 'Not found');
}
