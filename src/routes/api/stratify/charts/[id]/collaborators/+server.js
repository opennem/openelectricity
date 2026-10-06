import { json } from '@sveltejs/kit';
import { findAdminByEmail } from '$lib/auth/clerk-server.js';
import { loadChartForRequest } from '$lib/server/stratify/chart-access.js';
import { COLLABORATOR_ROLES } from '$lib/stratify/chart-permissions.js';
import {
	addCollaborator,
	removeCollaborator,
	setCollaboratorRole,
	updateCollaborators
} from '$lib/server/stratify/collaborators.js';

/**
 * Share a chart with other Stratify admins (owner only). Called by the
 * builder's Share panel.
 *
 * - POST `{ email, role }` adds an admin by email, or changes their role.
 * - PATCH `{ userId, role }` changes a collaborator's role.
 * - DELETE `{ userId }` stops sharing with them.
 *
 * `role` is `editor` or `viewer`. Each responds `{ collaborators, chart:
 * { _id, _rev }, parentRev }` (`parentRev` is the revision the change
 * replaced, null when nothing changed), so the builder can keep its base
 * revision in step.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** @param {unknown} role */
function isRole(role) {
	return COLLABORATOR_ROLES.includes(/** @type {any} */ (role));
}

/**
 * Load the chart for a sharing change and run it.
 * @param {Request} request
 * @param {string} id
 * @param {(context: { auth: import('$lib/server/stratify/chart-access.js').ChartAuth, chart: Record<string, any>, body: Record<string, any> }) => Promise<Response | Parameters<typeof updateCollaborators>[1]['change']>} prepare
 *   Validates the body; returns a response to send, or the change to apply.
 */
async function share(request, id, prepare) {
	const loaded = await loadChartForRequest(request, id, 'share');
	if (loaded.response) return loaded.response;
	const { client, auth, chart } = loaded;

	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') return json({ error: 'Invalid body' }, { status: 400 });

	const change = await prepare({ auth, chart, body });
	if (change instanceof Response) return change;

	const result = await updateCollaborators(client, {
		id,
		change,
		author: { userId: auth.userId ?? null, userEmail: auth.userEmail ?? null }
	});

	switch (result.outcome) {
		case 'not-found':
			return json({ error: 'Not found' }, { status: 404 });
		case 'invalid':
			return json({ error: result.error }, { status: 400 });
		case 'unchanged':
			return json({
				collaborators: result.collaborators,
				chart: { _id: id, _rev: result.rev },
				parentRev: null
			});
		case 'saved':
			return json({
				collaborators: result.collaborators,
				chart: { _id: id, _rev: result.rev },
				parentRev: result.parentRev
			});
	}
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, params }) {
	return share(request, params.id, async ({ auth, chart, body }) => {
		const email = typeof body.email === 'string' ? body.email.trim() : '';
		if (!EMAIL.test(email)) return json({ error: 'Enter an email address' }, { status: 400 });
		if (!isRole(body.role))
			return json({ error: 'role must be editor or viewer' }, { status: 400 });

		const person = await findAdminByEmail(email);
		if (!person) {
			return json({ error: 'No Stratify admin uses that email address' }, { status: 404 });
		}
		if (person.userId === chart.userId) {
			return json({ error: 'That person owns this chart' }, { status: 400 });
		}

		return (list) =>
			addCollaborator(list, {
				...person,
				role: body.role,
				addedBy: auth.userId ?? null,
				now: new Date()
			});
	});
}

/** @type {import('./$types').RequestHandler} */
export async function PATCH({ request, params }) {
	return share(request, params.id, async ({ body }) => {
		if (typeof body.userId !== 'string' || !isRole(body.role)) {
			return json({ error: 'userId and role (editor or viewer) are required' }, { status: 400 });
		}
		return (list) => setCollaboratorRole(list, body.userId, body.role);
	});
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE({ request, params }) {
	return share(request, params.id, async ({ body }) => {
		if (typeof body.userId !== 'string') {
			return json({ error: 'userId is required' }, { status: 400 });
		}
		return (list) => removeCollaborator(list, body.userId);
	});
}
