import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity';

/** @typedef {import('$lib/types/unit.types').Unit} Unit */

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const code = encodeURIComponent(params.id);
	const data = await client.fetch(
		`*[_type == "facility" && code == "${code}"]
			{_id, name, code, photos, description,
				units[]->{
					_id, name, code, dispatch_type, status, capacity_registered, emissions_factor_co2, data_first_seen, data_last_seen, fuel_technology->
				}
			}`
	);
	console.log(`Loading ${code}`);

	if (data && data.length > 0) {
		return {
			facility: {
				name: data[0].name,
				code: data[0].code,
				photos: data[0].photos,
				units: data[0].units.map((/** @type {Unit} */ unit) => {
					return {
						...unit,
						fuel_technology_name: unit.fuel_technology.name
					};
				}),
				description: data[0].description
			}
		};
	}

	throw error(404, 'Not found');
}
