import { fetchHomepageRenewablesInput } from '$lib/oe-api/fetch-renewables.server';

/**
 * Homepage fossil-vs-renewables data in a single, edge-cacheable call.
 * Bundles the three OE API requests the hero chart's `oe_homepage` mode needs
 * (renewable generation, gross demand, fossil fueltech sum) into one response.
 *
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ setHeaders }) {
	const result = await fetchHomepageRenewablesInput();

	// Monthly data with the in-progress month already trimmed — a 1-hour cache
	// lets Cloudflare serve the heavy OE fetch from the edge for the homepage.
	setHeaders({ 'cache-control': 'public, max-age=3600' });

	return Response.json(result);
}
