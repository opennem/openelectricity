import { building } from '$app/env';
import { ARTICLE_LOGIN } from '$app/env/private';

/** @type {import('@sveltejs/kit/hooks').Handle} */
export const handle = async ({ event, resolve }) => {
	let url = new URL(event.request.url);

	if (url.pathname.startsWith('/article-drafts')) {
		const auth = event.request.headers.get('Authorization');

		if (auth !== `Basic ${btoa(ARTICLE_LOGIN)}`) {
			return new Response('Not authorized', {
				status: 401,
				headers: {
					'WWW-Authenticate': 'Basic realm="User Visible Realm", charset="UTF-8"'
				}
			});
		}
	}

	if (building) {
		const response = await resolve(event);

		return response; // bailing here allows the 404 page to build
	}

	// measure speed
	const route = event.url;

	let start = performance.now();
	const response = await resolve(event);
	let end = performance.now();

	let responseTime = end - start;

	if (responseTime > 2000) {
		console.log(`🐢 ${route} took ${responseTime.toFixed(2)} ms`);
	}

	if (responseTime < 1000) {
		console.log(`🚀 ${route} took ${responseTime.toFixed(2)} ms`);
	}

	return response;
};
