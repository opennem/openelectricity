import { createClient } from '@sanity/client';
import { PUBLIC_SANITY_DATASET, PUBLIC_SANITY_PROJECT_ID } from '$env/static/public';
import { env } from '$env/dynamic/private';

/** @type {string[] | null} */
let cachedDatasets = null;

/** Fetch available datasets from Sanity API (cached for the process lifetime) */
export async function getAvailableDatasets() {
	if (cachedDatasets) return cachedDatasets;

	const res = await fetch(
		`https://${PUBLIC_SANITY_PROJECT_ID}.api.sanity.io/v2025-04-30/datasets`,
		{ headers: { Authorization: `Bearer ${env.SANITY_CMS_TOKEN}` } }
	);

	if (res.ok) {
		/** @type {{ name: string }[]} */
		const datasets = await res.json();
		cachedDatasets = datasets
			.map((d) => d.name)
			.filter((name) => !name.includes('-comments'))
			.sort((a, b) => (a === 'production' ? -1 : b === 'production' ? 1 : a.localeCompare(b)));
	} else {
		cachedDatasets = [PUBLIC_SANITY_DATASET];
	}

	return cachedDatasets;
}

/**
 * Create a write-capable Sanity client for CMS operations.
 * @param {string} [dataset] Override dataset (defaults to PUBLIC_SANITY_DATASET)
 */
export function createCmsClient(dataset) {
	return createClient({
		projectId: PUBLIC_SANITY_PROJECT_ID,
		dataset: dataset || PUBLIC_SANITY_DATASET,
		apiVersion: '2025-04-30',
		useCdn: false,
		token: env.SANITY_CMS_TOKEN
	});
}

/**
 * Resolve the active CMS dataset from a cookie, validated against available datasets.
 * @param {import('@sveltejs/kit').Cookies} cookies
 */
export async function resolveDataset(cookies) {
	const available = await getAvailableDatasets();
	const cookie = cookies.get('cms-dataset');
	return cookie && available.includes(cookie) ? cookie : PUBLIC_SANITY_DATASET;
}

/** Backwards-compatible default client */
export const cmsClient = createCmsClient();

