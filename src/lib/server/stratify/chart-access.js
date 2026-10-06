/**
 * Who may do what with a Stratify chart.
 *
 * - `owner`: the chart's creator, or a superadmin. Reads, edits, publishes,
 *   deletes, sees and restores history.
 * - `reader`: any Stratify admin, for a published chart. Reads and forks.
 */

import { json } from '@sveltejs/kit';
import { createCmsClient } from '$lib/sanity-cms.js';
import { verifyAdmin } from '$lib/auth/clerk-server.js';

/** @typedef {'owner' | 'reader'} ChartAccess */

/**
 * @typedef {Awaited<ReturnType<typeof verifyAdmin>>} ChartAuth
 */

/**
 * @param {{ userId?: string, status?: string }} chart
 * @param {{ userId?: string, isSuperAdmin: boolean }} auth
 * @returns {ChartAccess | null}
 */
export function getChartAccess(chart, auth) {
	if (auth.isSuperAdmin || (auth.userId && chart.userId === auth.userId)) return 'owner';
	if (chart.status === 'published') return 'reader';
	return null;
}

/**
 * Authenticate a Stratify admin and load a chart they may use.
 *
 * Responds 401/403 for non-admins and 404 for a missing chart or one the
 * user cannot read; a reader who needs `owner` access gets 403.
 * @param {Request} request
 * @param {string} id
 * @param {ChartAccess} need
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
export async function loadChartForRequest(request, id, need, { full = false } = {}) {
	const auth = await verifyAdmin(request);
	if (!auth.isAdmin) {
		return {
			response: json({ error: 'Unauthorised' }, { status: auth.authenticated ? 403 : 401 })
		};
	}

	const client = createCmsClient();
	const projection = full ? '' : '{ _id, _rev, userId, status }';
	const chart = await client.fetch(`*[_type == "stratifyChart" && _id == $id][0]${projection}`, {
		id
	});
	const access = chart ? getChartAccess(chart, auth) : null;

	if (!chart || !access) return { response: json({ error: 'Not found' }, { status: 404 }) };
	if (need === 'owner' && access !== 'owner') {
		return { response: json({ error: 'Forbidden' }, { status: 403 }) };
	}

	return { response: null, auth, client, chart, access };
}
