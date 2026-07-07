/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

// Unique cache per deployment — old caches are dropped on activate.
const CACHE = `cache-${version}`;

// Precache the built app plus an allowlist of the static chrome the shell
// needs offline. static/ also holds huge committed datasets (~35MB /og,
// ~247MB /data) and raw font-family downloads — allowlisting keeps future
// heavy additions out by default (cache.addAll fails atomically, so one
// oversized asset would otherwise block the whole install).
const STATIC_ASSETS = ['/favicon.png', '/icon-192.png', '/logo-mark.png', '/manifest.webmanifest'];
const ASSETS = [
	...build,
	...files.filter(
		(path) =>
			STATIC_ASSETS.includes(path) ||
			/^\/fonts\/[^/]+\.(ttf|woff2?)$/.test(path) ||
			path.startsWith('/img/icons/') ||
			path.startsWith('/map-styles/')
	)
];
const ASSET_PATHS = new Set(ASSETS);

sw.addEventListener('install', (event) => {
	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);
	}

	event.waitUntil(addFilesToCache());
});

sw.addEventListener('activate', (event) => {
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key !== CACHE) await caches.delete(key);
		}
	}

	event.waitUntil(deleteOldCaches());
});

sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);

	// Live market data must stay live — never intercept API calls, and leave
	// cross-origin requests (map tiles, Sanity images, analytics) alone.
	if (url.origin !== sw.location.origin || url.pathname.startsWith('/api/')) return;

	async function respond() {
		const cache = await caches.open(CACHE);

		// Immutable build output and precached static files serve straight
		// from the cache.
		if (ASSET_PATHS.has(url.pathname)) {
			const cached = await cache.match(url.pathname);
			if (cached) return cached;
		}

		// Everything else is network-first. Only page navigations are added to
		// the cache (so previously visited pages open offline) — caching every
		// GET would fill Cache Storage with volatile data payloads.
		try {
			const response = await fetch(event.request);
			if (!(response instanceof Response)) {
				throw new Error('invalid response from fetch');
			}
			if (response.status === 200 && event.request.mode === 'navigate') {
				cache.put(event.request, response.clone());
			}
			return response;
		} catch (err) {
			const cached = await cache.match(event.request);
			if (cached) return cached;
			throw err;
		}
	}

	event.respondWith(respond());
});
