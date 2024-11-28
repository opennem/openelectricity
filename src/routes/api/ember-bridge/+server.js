import { error } from '@sveltejs/kit';
import { PUBLIC_EMBER_BRIDGE_API } from '$env/static/public';

export async function GET({ fetch, url }) {
	// /v4/ember/AUS/monthly.json

	const { searchParams } = url;
	const region = searchParams.get('region') || 'x-WRD';
	const interval = searchParams.get('interval') || 'yearly'; // yearly, monthly

	const dataPath = `${PUBLIC_EMBER_BRIDGE_API}/v4/ember/${region}/${interval}.json`;
	console.log('/api/ember-bridge/', dataPath);

	const res = await fetch(dataPath);

	if (res.ok) {
		return res;
	}

	error(404, 'Not found');
}
