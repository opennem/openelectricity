import { json } from '@sveltejs/kit';
import { loadChartForRequest } from '$lib/server/stratify/chart-access.js';
import { REVISION_TYPE } from '$lib/server/stratify/revisions.js';

const LATEST_REVISION_QUERY = `*[_type == $type && chartId == $id] | order(createdAt desc)[0] {
	userEmail, kind, summary, createdAt, updatedAt
}`;

/**
 * GET /api/stratify/charts/:id/head — the chart's current `_rev` and its
 * latest change, for the builder to notice other people's saves. Polled
 * every 30 seconds while a builder tab is visible, so it reads two small
 * projections and nothing else.
 *
 * Response: `{ rev, latest: { userEmail, kind, summary, at } | null }`.
 * 404 once the caller can no longer read the chart.
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ request, params }) {
	const loaded = await loadChartForRequest(request, params.id, 'read');
	if (loaded.response) return loaded.response;

	const latest = await loaded.client.fetch(LATEST_REVISION_QUERY, {
		type: REVISION_TYPE,
		id: params.id
	});

	return json(
		{
			rev: loaded.chart._rev,
			latest: latest
				? {
						userEmail: latest.userEmail ?? null,
						kind: latest.kind,
						summary: latest.summary ?? '',
						at: latest.updatedAt ?? latest.createdAt
					}
				: null
		},
		{ headers: { 'cache-control': 'no-store' } }
	);
}
