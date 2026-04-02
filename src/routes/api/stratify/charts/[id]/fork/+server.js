import { json } from '@sveltejs/kit';
import { createCmsClient } from '$lib/sanity-cms.js';
import { verifyAdmin } from '$lib/auth/clerk-server.js';

/**
 * POST /api/stratify/charts/:id/fork — fork a chart into the current user's account.
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ request, params }) {
	const auth = await verifyAdmin(request);
	if (!auth.isAdmin) {
		return json({ error: 'Unauthorised' }, { status: auth.authenticated ? 403 : 401 });
	}

	const client = createCmsClient();
	const source = await client.fetch(`*[_type == "stratifyChart" && _id == $id][0]`, {
		id: params.id
	});

	if (!source) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	// Normal users can only fork published charts; superadmin can fork any
	const isOwner = source.userId === auth.userId;
	if (!isOwner && !auth.isSuperAdmin && source.status !== 'published') {
		return json({ error: 'Not found' }, { status: 404 });
	}

	// Strip Sanity metadata and reassign ownership
	const {
		_id,
		_rev,
		_type,
		_createdAt,
		_updatedAt,
		userId,
		userEmail,
		status,
		publishedAt,
		...chartFields
	} = source;

	const doc = await client.create({
		_type: 'stratifyChart',
		...chartFields,
		userId: auth.userId,
		userEmail: auth.userEmail,
		status: 'draft',
		title: `${source.title || 'Untitled'} (fork)`,
		publishedAt: null,
		forkedFrom: source._id
	});

	return json({ chart: { _id: doc._id } }, { status: 201 });
}
