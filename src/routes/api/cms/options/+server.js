import { json } from '@sveltejs/kit';
import { createCmsClient, resolveDataset } from '$lib/sanity-cms.js';
import { verifyAdmin } from '$lib/auth/clerk-server.js';

const REGIONS_QUERY = `*[_type == "region"] | order(name asc) { _id, code, name }`;
const OWNERS_QUERY = `*[_type == "owner"] | order(name asc) { _id, name, legal_name }`;
const NETWORKS_QUERY = `*[_type == "network"] | order(name asc) { _id, code, name }`;
const FUEL_TECHS_QUERY = `*[_type == "fuel_technology"] | order(name asc) { _id, code, name, colour, renewable, dispatch_type }`;

/** @type {import('./$types').RequestHandler} */
export async function GET({ request, cookies }) {
	const auth = await verifyAdmin(request);
	if (!auth.isAdmin) {
		return json({ error: 'Unauthorised' }, { status: auth.authenticated ? 403 : 401 });
	}

	const client = createCmsClient(await resolveDataset(cookies));
	const [regions, owners, networks, fuelTechnologies] = await Promise.all([
		client.fetch(REGIONS_QUERY),
		client.fetch(OWNERS_QUERY),
		client.fetch(NETWORKS_QUERY),
		client.fetch(FUEL_TECHS_QUERY)
	]);

	return json({
		regions: regions ?? [],
		owners: owners ?? [],
		networks: networks ?? [],
		fuelTechnologies: fuelTechnologies ?? []
	});
}
