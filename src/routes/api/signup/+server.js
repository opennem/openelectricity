import { json, text } from '@sveltejs/kit';
import { MAILCHIMP_API_KEY, MAILCHIMP_LIST_ID } from '$env/static/private';
import { subscribe } from '$lib/server/newsletter.js';

const STATUS = { invalid: 400, unavailable: 502 };

/**
 * Newsletter sign-up from `SignUpForm`. Answers `{ ok: true }` for every
 * accepted address, whatever its list status (see `$lib/server/newsletter.js`).
 * @type {import('./$types').RequestHandler}
 */
export async function PUT({ request, fetch }) {
	const body = await request.json().catch(() => null);
	const result = await subscribe(body?.email, {
		fetch,
		apiKey: MAILCHIMP_API_KEY,
		listId: MAILCHIMP_LIST_ID
	});
	return json(result, { status: result.ok ? 200 : STATUS[result.reason] });
}

// This handler will respond to POST, PATCH, DELETE, etc.
/** @type {import('./$types').RequestHandler} */
export async function fallback() {
	return text('Nothing to see here');
}
