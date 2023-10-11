import { createClient } from '@sanity/client';

const client = createClient({
	projectId: 'bjedimft',
	dataset: 'production',
	apiVersion: '2023-10-11',
	useCdn: false
});

export async function load({ params }) {
	const data = await client.fetch(`*[_type == "station"]`);

	if (data) {
		return {
			station: []
		};
	}
	return {
		status: 500,
		body: new Error('Internal Server Error')
	};
}
