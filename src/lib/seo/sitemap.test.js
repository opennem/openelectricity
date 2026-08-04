import { describe, expect, it } from 'vitest';
import { sitemapIndexXml, toLastmod, urlsetXml, xmlResponse } from './sitemap.js';

describe('urlsetXml', () => {
	it('builds a urlset with optional lastmod', () => {
		const xml = urlsetXml([
			{ loc: 'https://example.com/a', lastmod: '2026-08-04' },
			{ loc: 'https://example.com/b' }
		]);
		expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
		expect(xml).toContain(
			'<url><loc>https://example.com/a</loc><lastmod>2026-08-04</lastmod></url>'
		);
		expect(xml).toContain('<url><loc>https://example.com/b</loc></url>');
	});

	it('escapes XML special characters in locs', () => {
		const xml = urlsetXml([{ loc: 'https://example.com/?a=1&b=<2>' }]);
		expect(xml).toContain('https://example.com/?a=1&amp;b=&lt;2&gt;');
		expect(xml).not.toContain('&b=<');
	});
});

describe('sitemapIndexXml', () => {
	it('builds a sitemapindex with escaped locs', () => {
		const xml = sitemapIndexXml(['https://example.com/sitemap-a.xml?x=1&y=2']);
		expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
		expect(xml).toContain(
			'<sitemap><loc>https://example.com/sitemap-a.xml?x=1&amp;y=2</loc></sitemap>'
		);
	});
});

describe('xmlResponse', () => {
	it('sets the XML content type and edge cache policy', () => {
		const res = xmlResponse('<x/>');
		expect(res.headers.get('content-type')).toBe('application/xml; charset=utf-8');
		expect(res.headers.get('cache-control')).toBe('public, max-age=3600');
	});
});

describe('toLastmod', () => {
	it('trims Sanity timestamps to a date', () => {
		expect(toLastmod('2026-07-30T02:15:00Z')).toBe('2026-07-30');
	});

	it('returns null for missing or malformed input', () => {
		expect(toLastmod(null)).toBeNull();
		expect(toLastmod('not a date')).toBeNull();
	});
});
