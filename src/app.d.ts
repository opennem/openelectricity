// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	// Fathom Analytics, loaded via the CDN snippet in app.html. Optional
	// because the deferred script may not have loaded (or is ad-blocked).
	interface Window {
		fathom?: {
			trackEvent(name: string): void;
		};
	}

	// Minimal structural view of a D1 binding — only what the network-cache
	// registry uses, hand-rolled to avoid @cloudflare/workers-types.
	interface D1PreparedStatement {
		bind(...values: unknown[]): D1PreparedStatement;
		first<T = Record<string, unknown>>(): Promise<T | null>;
		all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
		run(): Promise<unknown>;
	}
	interface D1Database {
		prepare(query: string): D1PreparedStatement;
	}

	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// Minimal structural view of the Cloudflare adapter's platform object —
		// enough for cache/waitUntil/binding usage without depending on
		// @cloudflare/workers-types. Everything optional: absent in `vite dev`,
		// and bindings absent until configured in the Cloudflare dashboard.
		interface Platform {
			context?: { waitUntil(promise: Promise<unknown>): void };
			caches?: {
				default: {
					match(key: string | Request): Promise<Response | undefined>;
					put(key: string | Request, response: Response): Promise<void>;
				};
			};
			env?: {
				CACHE_REGISTRY?: D1Database;
			};
		}
	}
}

export {};

declare module 'chroma-js';

// Vite's `?raw` suffix imports a file's contents as a string. The project's
// jsconfig `types` array doesn't pull in `vite/client`, so declare it here.
declare module '*?raw' {
	const content: string;
	export default content;
}
