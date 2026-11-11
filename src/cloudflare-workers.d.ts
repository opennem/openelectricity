// The Workers runtime module (emulated by the Cloudflare adapter in `vite dev`).
// Declared minimally — only what #lib/server/edge-runtime.js uses — since there
// is no wrangler config to generate full types from (`wrangler types`).
declare module 'cloudflare:workers' {
	export const env: Record<string, unknown>;
	export function waitUntil(promise: Promise<unknown>): void;
}
