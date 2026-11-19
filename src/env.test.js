import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { variables } from './env.js';

/**
 * SvelteKit 3 exposes only the variables `src/env.js` declares. An undeclared
 * one reads as `undefined` with no error, which silently turned Sentry off in
 * v3.74.0. Every variable the source names must therefore be declared.
 */

const SRC = new URL('.', import.meta.url).pathname;
const declared = new Set(Object.keys(variables));

/** @param {string} dir @returns {string[]} */
function sourceFiles(dir) {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return sourceFiles(path);
		if (!/\.(js|svelte)$/.test(entry.name) || /\.test\.js$/.test(entry.name)) return [];
		return [path];
	});
}

/** @param {string} code @returns {string[]} */
function namesUsed(code) {
	const names = new Set();
	// `import { A, B } from '$app/env/public'` (or `/private`)
	for (const [, list] of code.matchAll(
		/import\s*\{([^}]*)\}\s*from\s*['"]\$app\/env\/(?:public|private)['"]/g
	)) {
		for (const part of list.split(',')) {
			const name = part.trim().split(/\s+as\s+/)[0];
			if (name) names.add(name);
		}
	}
	// `env.X`, but not Vite's `import.meta.env` or Node's `process.env`
	for (const [, name] of code.matchAll(/(?<!meta\.|process\.)\benv\.([A-Z][A-Z0-9_]+)/g))
		names.add(name);
	// Any `PUBLIC_*` name, however it is read
	for (const [name] of code.matchAll(/\bPUBLIC_[A-Z0-9_]+\b/g)) names.add(name);
	return [...names];
}

describe('src/env.js', () => {
	it('declares every environment variable the source reads', () => {
		const undeclared = sourceFiles(SRC).flatMap((file) =>
			namesUsed(readFileSync(file, 'utf8'))
				.filter((name) => !declared.has(name))
				.map((name) => `${name} (${relative(SRC, file)})`)
		);
		expect(undeclared).toEqual([]);
	});
});
