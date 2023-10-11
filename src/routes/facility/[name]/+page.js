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
	const data = await client.fetch(`*[_type == "station" && code == "${params.name}"]`);

	if (data && data.length > 0) {
		return { name: data[0].name, code: data[0].code };
	}

	throw error(404, 'Not found');
}
