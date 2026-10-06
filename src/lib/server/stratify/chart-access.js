/**
 * Decides a user's access to a Stratify chart and loads charts for API
 * routes. What each access level allows lives in
 * `$lib/stratify/chart-permissions.js`.
 *
 * Collaborators are stored on the chart as a native array,
 * `collaborators: [{ _key, userId, email, role, addedAt, addedBy }]`.
 */

import { json } from '@sveltejs/kit';
import { createCmsClient } from '$lib/sanity-cms.js';
import { verifyAdmin } from '$lib/auth/clerk-server.js';
import { canAccess } from '$lib/stratify/chart-permissions.js';

/** @typedef {import('$lib/stratify/chart-permissions.js').ChartAccess} ChartAccess */
/** @typedef {import('$lib/stratify/chart-permissions.js').ChartAction} ChartAction */

/**
 * @typedef {Awaited<ReturnType<typeof verifyAdmin>>} ChartAuth
 */

/**
 * @param {{ userId?: string, status?: string, collaborators?: Array<{ userId: string, role: string }> | null }} chart
 * @param {{ userId?: string, isSuperAdmin: boolean }} auth
 * @returns {ChartAccess | null}
 */
export function getChartAccess(chart, auth) {
	if (auth.isSuperAdmin || (auth.userId && chart.userId === auth.userId)) return 'owner';
	const role = auth.userId
		? chart.collaborators?.find((entry) => entry.userId === auth.userId)?.role
		: undefined;
	if (role === 'editor' || role === 'viewer') return role;
	if (chart.status === 'published') return 'reader';
	return null;
}

/**
 * Authenticate a Stratify admin and load a chart they may act on.
 *
 * Responds 401/403 for non-admins, 404 for a missing chart or one the user
 * cannot read, and 403 when they can read it but not perform `action`.
 * @param {Request} request
 * @param {string} id
 * @param {ChartAction} action
 * @param {{ full?: boolean }} [options] - `full` loads the whole document;
 *   otherwise only `_id`, `_rev` and the fields access depends on
 * @returns {Promise<
 *   | { response: Response }
 *   | {
 *       response: null,
 *       auth: ChartAuth,
 *       client: import('@sanity/client').SanityClient,
 *       chart: Record<string, any>,
 *       access: ChartAccess
 *     }
 * >}
 */
export async function loadChartForRequest(request, id, action, { full = false } = {}) {
	const auth = await verifyAdmin(request);
	if (!auth.isAdmin) {
		return {
			response: json({ error: 'Unauthorised' }, { status: auth.authenticated ? 403 : 401 })
		};
	}

	const client = createCmsClient();
	const projection = full ? '' : '{ _id, _rev, userId, userEmail, status, collaborators }';
	const chart = await client.fetch(`*[_type == "stratifyChart" && _id == $id][0]${projection}`, {
		id
	});
	const access = chart ? getChartAccess(chart, auth) : null;

	if (!chart || !access) return { response: json({ error: 'Not found' }, { status: 404 }) };
	if (!canAccess(access, action)) {
		return { response: json({ error: 'Forbidden' }, { status: 403 }) };
	}

	return { response: null, auth, client, chart, access };
}
