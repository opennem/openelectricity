import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reloadOnStaleBuild } from './stale-build.js';

vi.mock('$app/environment', () => ({ version: '2.0.0' }));

/** @type {EventTarget & { location: { reload: import('vitest').Mock } }} */
let page;

/**
 * Map-backed stand-in for `sessionStorage`.
 * @param {Record<string, string>} [initial]
 */
function createStorage(initial = {}) {
	const map = new Map(Object.entries(initial));
	return {
		getItem: (/** @type {string} */ k) => map.get(k) ?? null,
		setItem: (/** @type {string} */ k, /** @type {string} */ v) => void map.set(k, v)
	};
}

/** Report a chunk that didn't load, as Vite's preload helper does. */
function failChunk() {
	const event = new Event('vite:preloadError', { cancelable: true });
	page.dispatchEvent(event);
	return event;
}

beforeEach(() => {
	page = Object.assign(new EventTarget(), { location: { reload: vi.fn() } });
	vi.stubGlobal('window', page);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('reloadOnStaleBuild', () => {
	it('reloads once per build and leaves the import to fail with its own error', () => {
		vi.stubGlobal('sessionStorage', createStorage());
		reloadOnStaleBuild();
		// Cancelling would make Vite resolve the import to undefined.
		expect(failChunk().defaultPrevented).toBe(false);
		expect(page.location.reload).toHaveBeenCalledOnce();
		expect(failChunk().defaultPrevented).toBe(false);
		expect(page.location.reload).toHaveBeenCalledOnce();
	});

	it("doesn't count a reload made on an earlier build", () => {
		vi.stubGlobal('sessionStorage', createStorage({ 'oe:stale-build-reload:1.9.0': '1' }));
		reloadOnStaleBuild();
		failChunk();
		expect(page.location.reload).toHaveBeenCalledOnce();
	});

	it('leaves the page alone without session storage', () => {
		vi.stubGlobal('sessionStorage', {
			getItem() {
				throw new DOMException('Access is denied for this document.', 'SecurityError');
			}
		});
		reloadOnStaleBuild();
		failChunk();
		expect(page.location.reload).not.toHaveBeenCalled();
	});
});
