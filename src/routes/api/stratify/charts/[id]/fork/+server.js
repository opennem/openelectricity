import { json } from '@sveltejs/kit';
import { loadChartForRequest } from '$lib/server/stratify/chart-access.js';

/**
 * POST /api/stratify/charts/:id/fork — fork a chart into the current user's account.
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ request, params }) {
	const loaded = await loadChartForRequest(request, params.id, 'fork', { full: true });
	if (loaded.response) return loaded.response;
	const { client, auth, chart: source } = loaded;

	// Strip Sanity metadata, ownership, publish state and sharing; the fork is
	// a new private draft.
	const {
		_id,
		_rev,
		_type,
		_createdAt,
		_updatedAt,
		userId: _userId,
		userEmail: _userEmail,
		status: _status,
		publishedAt: _publishedAt,
		collaborators: _collaborators,
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
