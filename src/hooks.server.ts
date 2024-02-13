import type { Handle } from '@sveltejs/kit';
import { ADMIN_LOGIN } from '$env/static/private';
import { building } from '$app/environment';

export const handle: Handle = async ({ event, resolve }) => {
	if (building) {
		const response = await resolve(event);
		return response; // bailing here allows the 404 page to build
	}

	const url = new URL(event.request.url);
	const auth = event.request.headers.get('Authorization');

	if (auth !== `Basic ${btoa(ADMIN_LOGIN)}`) {
		return new Response('Not authorized', {
			status: 401,
			headers: {
				'WWW-Authenticate': 'Basic realm="User Visible Realm", charset="UTF-8"'
			}
		});
	}

	console.log('# Server Hook');
	console.log(url);
	console.log(auth);
	console.log(ADMIN_LOGIN);
	console.log('# End Server Hook');

	return resolve(event);
};
