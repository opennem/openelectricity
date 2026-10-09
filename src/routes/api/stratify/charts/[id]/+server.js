import { json } from '@sveltejs/kit';
import { decodeChartFields } from '$lib/stratify/chart-data.js';
import { findAdminIds } from '$lib/auth/clerk-server.js';
import { loadChartForRequest } from '$lib/server/stratify/chart-access.js';
import { recordAuthorName } from '$lib/server/stratify/author-name.js';
import { canAccess } from '$lib/stratify/chart-permissions.js';
import { pickChartFields, saveChartFields } from '$lib/server/stratify/save-chart.js';
import { deleteChartWithRevisions } from '$lib/server/stratify/revisions.js';

/**
 * GET /api/stratify/charts/:id — fetch a single chart, with the caller's
 * `access` (see `$lib/stratify/chart-permissions.js`).
 * The owner, superadmins and collaborators can read it; other admins can
 * read published charts, without the collaborator list. For the owner,
 * each collaborator carries `isAdmin`: false once they have lost the admin
 * role (their access has already ended; the owner can remove them).
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ request, params }) {
	const loaded = await loadChartForRequest(request, params.id, 'read', { full: true });
	if (loaded.response) return loaded.response;
	const { chart, access } = loaded;

	/** @type {Array<Record<string, any>>} */
	const collaborators = access === 'reader' ? [] : (chart.collaborators ?? []);

	return json({
		chart: {
			...decodeChartFields(chart),
			collaborators: access === 'owner' ? await withAdminStatus(collaborators) : collaborators,
			access
		}
	});
}

/**
 * Flag collaborators who are no longer admins. If Clerk can't be reached,
 * the list is returned unflagged rather than failing the chart load.
 * @param {Array<Record<string, any>>} collaborators
 */
async function withAdminStatus(collaborators) {
	if (collaborators.length === 0) return collaborators;
	try {
		const admins = await findAdminIds(collaborators.map((person) => person.userId));
		return collaborators.map((person) => ({ ...person, isAdmin: admins.has(person.userId) }));
	} catch {
		return collaborators;
	}
}

/**
 * PATCH /api/stratify/charts/:id — save changed fields (owner or editor;
 * only the owner may change `status`/`publishedAt`).
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
	const loaded = await loadChartForRequest(request, params.id, 'edit');
	if (loaded.response) return loaded.response;
	const { client, auth, access, chart } = loaded;

	const body = await request.json();
	const isFieldSave = typeof body?.fields === 'object' && body.fields !== null;
	if (isFieldSave && typeof body.baseRev !== 'string') {
		return json({ error: 'baseRev is required' }, { status: 400 });
	}

	const values = pickChartFields(isFieldSave ? body.fields : body);
	if (Object.keys(values).length === 0) {
		return json({ error: 'No fields to update' }, { status: 400 });
	}
	if (('status' in values || 'publishedAt' in values) && !canAccess(access, 'publish')) {
		return json({ error: 'Only the owner can publish or unpublish' }, { status: 403 });
	}

	const result = await saveChartFields(client, {
		id: params.id,
		baseRev: isFieldSave ? body.baseRev : null,
		values,
		author: { userId: auth.userId ?? null, userEmail: auth.userEmail ?? null }
	});

	// Publishing records the owner's name as the public byline.
	if (
		values.status === 'published' &&
		(result.outcome === 'saved' || result.outcome === 'unchanged')
	) {
		await recordAuthorName(client, params.id, chart.userId);
	}

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
 * DELETE /api/stratify/charts/:id — delete a chart and its revisions (owner only).
 * @type {import('./$types').RequestHandler}
 */
export async function DELETE({ request, params }) {
	const loaded = await loadChartForRequest(request, params.id, 'delete');
	if (loaded.response) return loaded.response;

	await deleteChartWithRevisions(loaded.client, params.id);

	return json({ deleted: true });
}
