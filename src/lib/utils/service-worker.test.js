import { describe, expect, it } from 'vitest';
import { shouldRegisterServiceWorker } from './service-worker.js';

/** @param {{ framed?: boolean, supported?: boolean }} [options] */
function fakeWindow({ framed = false, supported = true } = {}) {
	const win = /** @type {any} */ ({ navigator: supported ? { serviceWorker: {} } : {} });
	win.self = win;
	win.top = framed ? {} : win;
	return win;
}

describe('shouldRegisterServiceWorker', () => {
	it('registers on a top-level page', () => {
		expect(shouldRegisterServiceWorker(fakeWindow())).toBe(true);
	});

	it('skips pages inside an iframe, such as the embedded widget', () => {
		expect(shouldRegisterServiceWorker(fakeWindow({ framed: true }))).toBe(false);
	});

	it('skips browsers without service workers', () => {
		expect(shouldRegisterServiceWorker(fakeWindow({ supported: false }))).toBe(false);
	});
});
