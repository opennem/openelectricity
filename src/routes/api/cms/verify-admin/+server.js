import { verifyAdmin } from '#lib/auth/clerk-server.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	const result = await verifyAdmin(request);

	if (!result.authenticated) {
		return Response.json({ isAdmin: false }, { status: 401 });
	}

	if (!result.isAdmin) {
		return Response.json({ isAdmin: false }, { status: 403 });
	}

	return Response.json({ isAdmin: true });
}
