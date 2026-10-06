import { json } from '@sveltejs/kit';
import { createCmsClient } from '$lib/sanity-cms.js';
import { verifyAdmin } from '$lib/auth/clerk-server.js';
import { decodeChartFields } from '$lib/stratify/chart-data.js';
import { encodeChartFields } from '$lib/stratify/chart-fields.js';

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
 * PATCH /api/stratify/charts/:id — update a chart (owner or superadmin).
 * Accepts any subset of the registry fields in `$lib/stratify/chart-fields.js`;
 * other keys are ignored.
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

	const patches = encodeChartFields(body);

	if (Object.keys(patches).length === 0) {
		return json({ error: 'No fields to update' }, { status: 400 });
	}

	const result = await client.patch(params.id).set(patches).commit();

	return json({ chart: { _id: result._id } });
}

/**
 * DELETE /api/stratify/charts/:id — delete a chart (owner or superadmin).
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

	await client.delete(params.id);

	return json({ deleted: true });
}
