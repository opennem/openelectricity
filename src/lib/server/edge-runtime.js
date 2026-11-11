import { env, waitUntil } from 'cloudflare:workers';

/**
 * The Cloudflare runtime the server caches use: bindings (`env`), the edge
 * cache (`caches.default`) and `waitUntil`. SvelteKit 3's Cloudflare adapter
 * no longer puts these on `event.platform`; they come from
 * `cloudflare:workers` and the global `caches` instead (the adapter emulates
 * both in `vite dev` via wrangler's platform proxy). Gathered into one object
 * so the caches take it as an argument and tests can pass a fake.
 * @returns {EdgeRuntime}
 */
export function edgeRuntime() {
	return {
		env: /** @type {EdgeRuntime['env']} */ (env),
		// Cloudflare's CacheStorage adds `default`, which the DOM type lacks.
		caches: /** @type {EdgeRuntime['caches']} */ (/** @type {unknown} */ (globalThis.caches)),
		context: { waitUntil }
	};
}
