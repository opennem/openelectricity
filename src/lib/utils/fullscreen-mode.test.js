import { describe, expect, it } from 'vitest';
import { isFullscreenUrl, windowedHref } from './fullscreen-mode.js';

describe('isFullscreenUrl', () => {
	it('defaults to fullscreen with no param', () => {
		expect(isFullscreenUrl(new URL('https://x.test/facilities'))).toBe(true);
	});

	it('is windowed only for an explicit fullscreen=false', () => {
		expect(isFullscreenUrl(new URL('https://x.test/facilities?fullscreen=false'))).toBe(false);
	});

	it('treats any other value as fullscreen', () => {
		expect(isFullscreenUrl(new URL('https://x.test/facilities?fullscreen=true'))).toBe(true);
		expect(isFullscreenUrl(new URL('https://x.test/facilities?fullscreen='))).toBe(true);
	});

	it('ignores unrelated params', () => {
		expect(isFullscreenUrl(new URL('https://x.test/facilities?view=list'))).toBe(true);
	});
});

describe('windowedHref', () => {
	it('returns the href untouched when fullscreen (the default mode)', () => {
		expect(windowedHref('/facilities', false)).toBe('/facilities');
		expect(windowedHref('/facilities?view=list', false)).toBe('/facilities?view=list');
	});

	it('appends with ? when the href has no query', () => {
		expect(windowedHref('/facilities', true)).toBe('/facilities?fullscreen=false');
	});

	it('appends with & when the href already has a query', () => {
		expect(windowedHref('/facilities?view=list', true)).toBe(
			'/facilities?view=list&fullscreen=false'
		);
	});

	it('replaces rather than duplicates an existing fullscreen param', () => {
		expect(windowedHref('/facilities?fullscreen=false', true)).toBe('/facilities?fullscreen=false');
	});
});
