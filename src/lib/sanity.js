import { createClient } from '@sanity/client';
import { PUBLIC_SANITY_DATASET, PUBLIC_SANITY_PROJECT_ID } from '$env/static/public';
import imageUrlBuilder from '@sanity/image-url';

export const client = createClient({
	projectId: PUBLIC_SANITY_PROJECT_ID,
	dataset: PUBLIC_SANITY_DATASET,
	apiVersion: '2023-10-11',
	useCdn: false
});

const builder = imageUrlBuilder(client);

export const urlFor = (source) => {
	return builder.image(source);
};
