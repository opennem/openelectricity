import { json } from '@sveltejs/kit';
import { resolveDataset } from '$lib/sanity-cms.js';
import { verifyAdmin } from '$lib/auth/clerk-server.js';
import { PUBLIC_SANITY_PROJECT_ID } from '$env/static/public';
import { env } from '$env/dynamic/private';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, cookies }) {
	const auth = await verifyAdmin(request);
	if (!auth.isAdmin) {
		return json({ error: 'Unauthorised' }, { status: auth.authenticated ? 403 : 401 });
	}

	const formData = await request.formData();
	const file = /** @type {File | null} */ (formData.get('file'));

	if (!file || !(file instanceof File)) {
		return json({ error: 'No file provided' }, { status: 400 });
	}

	if (!file.type.startsWith('image/')) {
		return json({ error: 'File must be an image' }, { status: 400 });
	}

	if (file.size > MAX_SIZE) {
		return json({ error: 'File exceeds 10 MB limit' }, { status: 400 });
	}

	const dataset = await resolveDataset(cookies);
	const buffer = Buffer.from(await file.arrayBuffer());

	// Upload directly via Sanity Assets HTTP API
	const url = `https://${PUBLIC_SANITY_PROJECT_ID}.api.sanity.io/v2025-04-30/assets/images/${dataset}?filename=${encodeURIComponent(file.name)}`;
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': file.type,
			Authorization: `Bearer ${env.SANITY_CMS_TOKEN}`
		},
		body: buffer
	});

	if (!res.ok) {
		const text = await res.text();
		console.error('Sanity upload failed:', res.status, text);
		return json({ error: 'Upload to Sanity failed' }, { status: 502 });
	}

	const { document: assetDoc } = await res.json();

	return json({
		assetId: assetDoc._id,
		key: crypto.randomUUID().slice(0, 8)
	});
}
