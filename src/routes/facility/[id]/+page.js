import { error } from '@sveltejs/kit';
import { createClient } from '@sanity/client';

const client = createClient({
	projectId: 'bjedimft',
	dataset: 'production',
	apiVersion: '2023-10-11',
	useCdn: false
});

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const data = await client.fetch(
		`*[_type == "facility" && code == "${params.id}"]
			{_id, name, code, photos, units[]->, description}`
	);

	console.log(data);

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
