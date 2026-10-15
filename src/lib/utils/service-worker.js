import { dev } from '$app/environment';

/**
 * Whether this page should install the offline service worker
 * (`src/service-worker.js`). Only top-level pages do: inside an iframe (the
 * Tracker widget and chart embeds on other sites) browsers refuse or
 * partition service workers, and an embed gains nothing from an offline cache.
 * @param {Pick<Window, 'navigator' | 'self' | 'top'>} win
 */
export function shouldRegisterServiceWorker(win) {
	return 'serviceWorker' in win.navigator && win.self === win.top;
}

/**
 * Register the service worker once the page has loaded. SvelteKit's own
 * registration is off (`kit.serviceWorker.register` in `svelte.config.js`)
 * so embeds can skip it and a refusal (private browsing, blocked storage,
 * browser policy) stays quiet: the site works without one.
 */
export function registerServiceWorker() {
	if (!shouldRegisterServiceWorker(window)) return;
	const register = () =>
		navigator.serviceWorker
			.register('/service-worker.js', { type: dev ? 'module' : 'classic' })
			.catch(() => {});
	if (document.readyState === 'complete') register();
	else window.addEventListener('load', register, { once: true });
}
