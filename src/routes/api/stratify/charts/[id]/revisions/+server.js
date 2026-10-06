import { json } from '@sveltejs/kit';
import { decodeChartFields } from '$lib/stratify/chart-data.js';
import { loadChartForRequest } from '$lib/server/stratify/chart-access.js';
import { listRevisions } from '$lib/server/stratify/revisions.js';
import { restoreChartVersion } from '$lib/server/stratify/save-chart.js';

/** Per-user history: never cache. */
const NO_STORE = { 'cache-control': 'no-store' };

/**
 * GET /api/stratify/charts/:id/revisions — the chart's change history, newest
 * first (owner and collaborators). Called by the builder's History drawer.
 *
 * Query: `before` — the `nextBefore` cursor from the previous page.
 * Response: `{ revisions: RevisionSummary[], nextBefore: string | null }`.
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ request, params, url }) {
	const loaded = await loadChartForRequest(request, params.id, 'history');
	if (loaded.response) return loaded.response;

	const before = url.searchParams.get('before');
	if (before !== null && Number.isNaN(Date.parse(before))) {
		return json({ error: 'before must be a timestamp' }, { status: 400 });
	}

	const page = await listRevisions(loaded.client, params.id, { before });
	return json(page, { headers: NO_STORE });
}

/**
 * POST /api/stratify/charts/:id/revisions — restore the chart's settings to
 * how they were right after a revision (owner or editor). Publish state
 * is unchanged; the restore is logged as a new `restore` revision.
 *
 * Body: `{ restoreTo: revisionId }`.
 * Response: `{ chart: { _id, _rev }, latest }` with `latest` the restored
 * chart; 404 for an unknown revision; 409 if the chart changed mid-restore.
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ request, params }) {
	const loaded = await loadChartForRequest(request, params.id, 'restore', { full: true });
	if (loaded.response) return loaded.response;
	const { client, auth, chart } = loaded;

	const body = await request.json().catch(() => null);
	if (typeof body?.restoreTo !== 'string' || !body.restoreTo) {
		return json({ error: 'restoreTo is required' }, { status: 400 });
	}

	const result = await restoreChartVersion(client, {
		chart,
		revisionId: body.restoreTo,
		author: { userId: auth.userId ?? null, userEmail: auth.userEmail ?? null }
	});

	switch (result.outcome) {
		case 'not-found':
			return json({ error: 'Revision not found' }, { status: 404 });
		case 'conflict':
			return json(
				{ error: 'The chart changed while restoring. Try again.', chart: result.latest },
				{ status: 409 }
			);
		case 'unchanged':
			return json({
				chart: { _id: params.id, _rev: result.rev },
				latest: decodeChartFields(chart)
			});
		case 'saved':
			return json({ chart: { _id: params.id, _rev: result.rev }, latest: result.chart });
	}
}
