import { error } from '@sveltejs/kit';
import { PUBLIC_JSON_API } from '$env/static/public';
import energyHistory from '$lib/energy_history';

export async function GET({ fetch, setHeaders }) {
	setHeaders({
		'cache-control': 'max-age=604800' // 1 week
	});

	const res = await fetch(`${PUBLIC_JSON_API}/au/NEM/energy/all.json`);

	if (res.ok) {
		const { data } = await res.json();
		return Response.json(energyHistory(data));
	}

	error(404, 'Not found');
}
