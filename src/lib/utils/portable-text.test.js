import { describe, it, expect } from 'vitest';
import { dedupePortableTextKeys, hasPortableTextContent } from './portable-text.js';

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

describe('dedupePortableTextKeys', () => {
	it('passes non-arrays through unchanged', () => {
		expect(dedupePortableTextKeys(null)).toBe(null);
		expect(dedupePortableTextKeys(undefined)).toBe(undefined);
	});

	it('returns the same reference when keys are already unique', () => {
		const blocks = [
			{ _type: 'block', _key: 'a' },
			{ _type: 'block', _key: 'b' }
		];
		expect(dedupePortableTextKeys(blocks)).toBe(blocks);
	});

	it('suffixes later duplicates and keeps the first occurrence untouched', () => {
		const blocks = [
			{ _type: 'block', _key: 'description-block-125' },
			{ _type: 'block', _key: 'description-block-125' },
			{ _type: 'block', _key: 'description-block-125' }
		];
		const result = dedupePortableTextKeys(blocks);
		expect(result.map((/** @type {any} */ b) => b._key)).toEqual([
			'description-block-125',
			'description-block-125-dup-1',
			'description-block-125-dup-2'
		]);
		expect(result[0]).toBe(blocks[0]);
	});

	it('avoids colliding with an existing key that matches the suffix pattern', () => {
		const blocks = [
			{ _type: 'block', _key: 'a' },
			{ _type: 'block', _key: 'a-dup-1' },
			{ _type: 'block', _key: 'a' }
		];
		const result = dedupePortableTextKeys(blocks);
		expect(result[2]._key).toBe('a-dup-2');
	});

	it('leaves entries without a string key alone', () => {
		const blocks = [{ _type: 'block' }, { _type: 'block' }, null];
		expect(dedupePortableTextKeys(blocks)).toBe(blocks);
	});
});
