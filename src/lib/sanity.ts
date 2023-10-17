import { createClient } from '@sanity/client';
export const client = createClient({
	projectId: 'bjedimft',
	dataset: 'production',
	apiVersion: '2023-10-11',
	useCdn: false
});
