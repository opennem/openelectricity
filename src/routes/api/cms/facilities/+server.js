import { json } from '@sveltejs/kit';
import { createCmsClient, resolveDataset } from '$lib/sanity-cms.js';
import { verifyAdmin } from '$lib/auth/clerk-server.js';

/** @type {import('./$types').RequestHandler} */
export async function PATCH({ request, cookies }) {
	const auth = await verifyAdmin(request);
	if (!auth.isAdmin) {
		return json({ error: 'Unauthorised' }, { status: auth.authenticated ? 403 : 401 });
	}

	const { facilityId, patches } = await request.json();

	if (!facilityId || !patches || typeof patches !== 'object') {
		return json({ error: 'facilityId and patches are required' }, { status: 400 });
	}

	const client = createCmsClient(await resolveDataset(cookies));
	const result = await client.patch(facilityId).set(patches).commit();

	return json({ result });
}
