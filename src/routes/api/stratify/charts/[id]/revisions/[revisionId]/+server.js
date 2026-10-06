import { json } from '@sveltejs/kit';
import { decodeChartFields } from '$lib/stratify/chart-data.js';
import { loadChartForRequest } from '$lib/server/stratify/chart-access.js';
import { getRevisionVersion } from '$lib/server/stratify/revisions.js';

/**
 * GET /api/stratify/charts/:id/revisions/:revisionId — one revision's field
 * changes, and the chart as it was right after it (owner and collaborators).
 * Called by the History drawer to expand an entry and preview a version.
 *
 * Response: `{ revision: RevisionDetail, chart }`, where `chart` is the
 * decoded chart with that version's settings (current publish state).
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ request, params }) {
	const loaded = await loadChartForRequest(request, params.id, 'history', { full: true });
	if (loaded.response) return loaded.response;

	const version = await getRevisionVersion(
		loaded.client,
		decodeChartFields(loaded.chart),
		params.revisionId
	);
	if (!version) return json({ error: 'Revision not found' }, { status: 404 });

	return json(
		{ revision: version.revision, chart: version.chart },
		{ headers: { 'cache-control': 'no-store' } }
	);
}
