import { json } from '@sveltejs/kit';
import { searchAdmins, verifyAdmin } from '$lib/auth/clerk-server.js';

/** Shortest query worth searching, and the longest accepted. */
const MIN_QUERY = 2;
const MAX_QUERY = 100;

/**
 * GET /api/stratify/admins?q= — Stratify admins matching a partial email,
 * name or username, for the Share panel's suggestions. Admins only;
 * never cached.
 *
 * Response: `{ admins: [{ userId, email, name }] }` (at most 10); empty for
 * queries shorter than two characters.
 * @type {import('./$types').RequestHandler}
 */
export async function GET({ request, url }) {
	const auth = await verifyAdmin(request);
	if (!auth.isAdmin) {
		return json({ error: 'Unauthorised' }, { status: auth.authenticated ? 403 : 401 });
	}

	const query = (url.searchParams.get('q') ?? '').trim();
	if (query.length > MAX_QUERY) return json({ error: 'Query too long' }, { status: 400 });

	const admins = query.length < MIN_QUERY ? [] : await searchAdmins(query);
	return json({ admins }, { headers: { 'cache-control': 'no-store' } });
}
