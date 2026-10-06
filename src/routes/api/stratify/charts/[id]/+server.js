import { json } from '@sveltejs/kit';
import { decodeChartFields } from '$lib/stratify/chart-data.js';
import { loadChartForRequest } from '$lib/server/stratify/chart-access.js';
import { pickChartFields, saveChartFields } from '$lib/server/stratify/save-chart.js';
import { deleteChartWithRevisions } from '$lib/server/stratify/revisions.js';

/**
 * GET /api/stratify/charts/:id — fetch a single chart.
 * Owner can always read. Others can read published charts. Superadmin can read any.
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ request, params }) {
	const loaded = await loadChartForRequest(request, params.id, 'reader', { full: true });
	if (loaded.response) return loaded.response;

	return json({ chart: decodeChartFields(loaded.chart) });
}

/**
 * PATCH /api/stratify/charts/:id — save changed fields (owner or superadmin).
 *
 * Body: `{ baseRev, fields }`, where `fields` holds only the registry fields
 * (`$lib/stratify/chart-fields.js`) the editor changed since loading chart
 * revision `baseRev`. Saves that other editors' saves don't overlap merge;
 * overlapping ones return 409 with the current chart so the editor can
 * resolve them. Every save writes a `stratifyChartRevision`.
 *
 * Responses: 200 `{ chart: { _id, _rev }, latest }` (`latest` is the merged
 * chart when the save landed on a newer revision, otherwise null); 409
 * `{ error, conflicts: [{ field, changedBy }], chart }`.
 *
 * A body without `fields` is the earlier whole-snapshot save from editors
 * opened before this protocol: it is saved without conflict checks.
 * @type {import('./$types').RequestHandler}
 */
export async function PATCH({ request, params }) {
	const loaded = await loadChartForRequest(request, params.id, 'owner');
	if (loaded.response) return loaded.response;
	const { client, auth } = loaded;

	const body = await request.json();
	const isFieldSave = typeof body?.fields === 'object' && body.fields !== null;
	if (isFieldSave && typeof body.baseRev !== 'string') {
		return json({ error: 'baseRev is required' }, { status: 400 });
	}

	const values = pickChartFields(isFieldSave ? body.fields : body);
	if (Object.keys(values).length === 0) {
		return json({ error: 'No fields to update' }, { status: 400 });
	}

	const result = await saveChartFields(client, {
		id: params.id,
		baseRev: isFieldSave ? body.baseRev : null,
		values,
		author: { userId: auth.userId ?? null, userEmail: auth.userEmail ?? null }
	});

	switch (result.outcome) {
		case 'not-found':
			return json({ error: 'Not found' }, { status: 404 });
		case 'conflict':
			return json(
				{ error: 'Conflict', conflicts: result.conflicts, chart: result.latest },
				{ status: 409 }
			);
		case 'unchanged':
			return json({ chart: { _id: params.id, _rev: result.rev }, latest: null });
		case 'saved':
			return json({
				chart: { _id: params.id, _rev: result.rev },
				latest: result.merged ? result.chart : null
			});
	}
}

/**
 * DELETE /api/stratify/charts/:id — delete a chart and its revisions (owner or superadmin).
 * @type {import('./$types').RequestHandler}
 */
export async function DELETE({ request, params }) {
	const loaded = await loadChartForRequest(request, params.id, 'owner');
	if (loaded.response) return loaded.response;

	await deleteChartWithRevisions(loaded.client, params.id);

	return json({ deleted: true });
}
