import { describe, it, expect } from 'vitest';
import { hasPortableTextContent } from './portable-text.js';

describe('hasPortableTextContent', () => {
	it('returns false for non-arrays', () => {
		expect(hasPortableTextContent(/** @type {any} */ (null))).toBe(false);
		expect(hasPortableTextContent(/** @type {any} */ (undefined))).toBe(false);
		expect(hasPortableTextContent(/** @type {any} */ ('text'))).toBe(false);
	});

	it('returns false for an empty array', () => {
		expect(hasPortableTextContent([])).toBe(false);
	});

	it('returns false for blocks with only whitespace text', () => {
		expect(
			hasPortableTextContent([
				{
					_type: 'block',
					children: [
						{ _type: 'span', text: '   ' },
						{ _type: 'span', text: '' }
					]
				}
			])
		).toBe(false);
	});

	it('returns true when a block has non-whitespace text', () => {
		expect(
			hasPortableTextContent([{ _type: 'block', children: [{ _type: 'span', text: 'Hello' }] }])
		).toBe(true);
	});

	it('treats non-block entries (e.g. images) as content', () => {
		expect(hasPortableTextContent([{ _type: 'image', asset: { _ref: 'image-abc' } }])).toBe(true);
	});

	it('ignores malformed entries', () => {
		expect(hasPortableTextContent([null, 'nope', { _type: 'block' }])).toBe(false);
	});
});
