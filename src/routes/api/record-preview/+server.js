import { CLOUDFLARE_WORKER_URL } from '$env/static/private';

export async function GET({ url }) {
	const { searchParams } = url;
	const key = searchParams.get('key');

	if (!key) {
		return new Response('No key provided', { status: 400 });
	}

	const res = await fetch(`${CLOUDFLARE_WORKER_URL}/?key=${key}`);

	if (res.ok) {
		const blob = await res.blob();
		return new Response(blob);
	}

	return new Response('Error', { status: 500 });
}
