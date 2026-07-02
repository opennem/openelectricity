import { describe, it, expect } from 'vitest';
import { facilityPhotoSrc } from './facility-photo.js';

describe('facilityPhotoSrc', () => {
	it('builds a width-only transform', () => {
		expect(facilityPhotoSrc('https://cdn.sanity.io/img.jpg', { w: 1200 })).toBe(
			'https://cdn.sanity.io/img.jpg?w=1200&auto=format&q=75'
		);
	});

	it('crops when a height is provided', () => {
		expect(facilityPhotoSrc('https://cdn.sanity.io/img.jpg', { w: 800, h: 420 })).toBe(
			'https://cdn.sanity.io/img.jpg?w=800&h=420&fit=crop&auto=format&q=75'
		);
	});
});
