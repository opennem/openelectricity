// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// Minimal structural view of the Cloudflare adapter's platform object —
		// enough for cache/waitUntil usage without depending on
		// @cloudflare/workers-types. Everything optional: absent in `vite dev`.
		interface Platform {
			context?: { waitUntil(promise: Promise<unknown>): void };
			caches?: {
				default: {
					match(key: string | Request): Promise<Response | undefined>;
					put(key: string | Request, response: Response): Promise<void>;
				};
			};
		}
	}
}

export {};

declare module 'chroma-js';
