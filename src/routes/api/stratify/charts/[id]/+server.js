import { json } from '@sveltejs/kit';
import { createCmsClient } from '$lib/sanity-cms.js';
import { verifyAdmin } from '$lib/auth/clerk-server.js';
import { decodeChartFields } from '$lib/stratify/chart-data.js';
import { pickChartFields, saveChartFields } from '$lib/server/stratify/save-chart.js';
import { deleteChartWithRevisions } from '$lib/server/stratify/revisions.js';

/**
 * GET /api/stratify/charts/:id — fetch a single chart.
 * Owner can always read. Others can read published charts. Superadmin can read any.
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ request, params }) {
	const auth = await verifyAdmin(request);
	if (!auth.isAdmin) {
		return json({ error: 'Unauthorised' }, { status: auth.authenticated ? 403 : 401 });
	}

	const client = createCmsClient();
	const chart = await client.fetch(`*[_type == "stratifyChart" && _id == $id][0]`, {
		id: params.id
	});

	if (!chart) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	const isOwner = chart.userId === auth.userId;
	if (!isOwner && !auth.isSuperAdmin && chart.status !== 'published') {
		return json({ error: 'Not found' }, { status: 404 });
	}

	return json({ chart: decodeChartFields(chart) });
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
	const auth = await verifyAdmin(request);
	if (!auth.isAdmin) {
		return json({ error: 'Unauthorised' }, { status: auth.authenticated ? 403 : 401 });
	}

	const client = createCmsClient();

	const existing = await client.fetch(
		`*[_type == "stratifyChart" && _id == $id][0]{ _id, userId }`,
		{ id: params.id }
	);

	if (!existing) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	if (existing.userId !== auth.userId && !auth.isSuperAdmin) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

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
			return json({ chart: { _id: params.id, _rev: result.rev }, latest: result.latest });
	}
}

/**
 * DELETE /api/stratify/charts/:id — delete a chart and its revisions (owner or superadmin).
 * @type {import('./$types').RequestHandler}
 */
export async function DELETE({ request, params }) {
	const auth = await verifyAdmin(request);
	if (!auth.isAdmin) {
		return json({ error: 'Unauthorised' }, { status: auth.authenticated ? 403 : 401 });
	}

	const client = createCmsClient();

	const existing = await client.fetch(
		`*[_type == "stratifyChart" && _id == $id][0]{ _id, userId }`,
		{ id: params.id }
	);

	if (!existing) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	if (existing.userId !== auth.userId && !auth.isSuperAdmin) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	await deleteChartWithRevisions(client, params.id);

	return json({ deleted: true });
}
