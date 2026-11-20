import { createCmsClient, resolveDataset } from '#lib/sanity-cms.js';
import { verifyAdmin } from '#lib/auth/clerk-server.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ request, cookies, url }) {
	const auth = await verifyAdmin(request);
	if (!auth.isAdmin) {
		return Response.json({ error: 'Unauthorised' }, { status: auth.authenticated ? 403 : 401 });
	}

	const ids = url.searchParams.get('ids')?.split(',').filter(Boolean) ?? [];
	if (!ids.length) return Response.json({});

	const client = createCmsClient(await resolveDataset(cookies));
	const query = `*[_id in $ids]{ _id, _type, name, title, code }`;
	const docs = await client.fetch(query, { ids });

	/** @type {Record<string, any>} */
	const result = {};
	for (const doc of docs ?? []) {
		result[doc._id] = doc;
	}

	return Response.json(result);
}
