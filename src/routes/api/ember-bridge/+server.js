import { error } from '@sveltejs/kit';
import { PUBLIC_EMBER_BRIDGE_API } from '$env/static/public';

export async function GET({ fetch, url }) {
	// /v4/ember/AUS/monthly.json

	const { searchParams } = url;
	const region = searchParams.get('region') || 'x-WRD';
	const range = searchParams.get('range') || 'yearly'; // yearly, monthly

	const dataPath = `${PUBLIC_EMBER_BRIDGE_API}/v4/ember/${region}/${range}.json`;
	console.log('/api/ember-bridge/', dataPath);

	const res = await fetch(dataPath);

	if (res.ok) {
		try {
			const data = await res.json();
			return new Response(JSON.stringify(data));
		} catch (err) {
			console.error('Error parsing JSON', err);
			return new Response(JSON.stringify({ error: 'Error parsing JSON', bodyText: res.body }), {
				status: 500
			});
		}
	}

	error(404, 'Not found');
}
