import { describe, it, expect } from 'vitest';
import { urlFor, createUrlFor } from './sanity.js';

const PHOTO = {
	_type: 'image',
	_key: 'abc123',
	asset: { _type: 'reference', _ref: 'image-deadbeef1234-800x600-jpg' }
};

describe('urlFor (default dataset)', () => {
	it('generates a URL containing the default dataset', () => {
		const url = urlFor(PHOTO).url();
		expect(url).toContain('cdn.sanity.io/images/');
		expect(url).toContain('/production/');
		expect(url).toContain('deadbeef1234-800x600.jpg');
	});
});

describe('createUrlFor', () => {
	it('generates a URL containing the specified dataset', () => {
		const urlForStaging = createUrlFor('staging');
		const url = urlForStaging(PHOTO).url();
		expect(url).toContain('/staging/');
		expect(url).toContain('deadbeef1234-800x600.jpg');
	});

	it('generates a URL for production dataset', () => {
		const urlForProd = createUrlFor('production');
		const url = urlForProd(PHOTO).url();
		expect(url).toContain('/production/');
		expect(url).toContain('deadbeef1234-800x600.jpg');
	});

	it('different datasets produce different URLs', () => {
		const urlProd = createUrlFor('production')(PHOTO).url();
		const urlStaging = createUrlFor('staging')(PHOTO).url();
		expect(urlProd).not.toEqual(urlStaging);
		expect(urlProd.replace('/production/', '/staging/')).toEqual(urlStaging);
	});

	it('supports width and height parameters', () => {
		const urlForStaging = createUrlFor('staging');
		const url = urlForStaging(PHOTO).width(400).height(240).url();
		expect(url).toContain('/staging/');
		expect(url).toContain('w=400');
		expect(url).toContain('h=240');
	});
});
