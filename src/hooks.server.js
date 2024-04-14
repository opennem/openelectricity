import Mixpanel from 'mixpanel';
import { UAParser } from 'ua-parser-js'; // https://docs.uaparser.js.org/v2/
import { ADMIN_LOGIN, MIXPANEL_API_KEY, MIXPANEL_TRACKING_ON } from '$env/static/private';
import { building } from '$app/environment';

const mixpanel = Mixpanel.init(MIXPANEL_API_KEY, { geolocate: true });

/** @type {import('@sveltejs/kit').Handle} */
export const handle = async ({ event, resolve }) => {
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

	if (MIXPANEL_TRACKING_ON) {
		const ua = new UAParser(event.request.headers.get('User-Agent'));

		// console.log('event', ua.getBrowser(), ua.getOS(), ua.getDevice(), ua.getCPU());

		const properties = {
			$browser: ua.getBrowser().name,
			$browserVersion: ua.getBrowser().version,
			$device: ua.getDevice().model,
			$deviceVendor: ua.getDevice().vendor,
			$os: ua.getOS().name,
			$osVersion: ua.getOS().version,
			$cpu: ua.getCPU().architecture
		};

		mixpanel.track('User-Agent', properties);
	}

	return response;
};
