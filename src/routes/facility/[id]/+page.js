import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity';

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const data = await client.fetch(
		`*[_type == "facility" && code == "${params.id}"]
			{_id, name, code, photos, description,
				units[]->{
					_id, name, code, dispatch_type, status, capacity_registered, emissions_factor_co2, data_first_seen, data_last_seen, fuel_technology->
				}
			}`
	);

	if (data && data.length > 0) {
		return {
			name: data[0].name,
			code: data[0].code,
			photos: data[0].photos,
			units: data[0].units,
			description: data[0].description
		};
	}

	throw error(404, 'Not found');
}
