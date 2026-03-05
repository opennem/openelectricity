import { describe, it, expect } from 'vitest';
import { EXTERNAL_LINKS } from './external-links.js';

describe('EXTERNAL_LINKS', () => {
	it('contains openStreetMap entry with label and baseUrl', () => {
		expect(EXTERNAL_LINKS.openStreetMap.label).toBe('OpenStreetMap');
		expect(EXTERNAL_LINKS.openStreetMap.baseUrl).toBe('https://www.openstreetmap.org');
	});

	it('contains wikidata entry with label and baseUrl', () => {
		expect(EXTERNAL_LINKS.wikidata.label).toBe('Wikidata');
		expect(EXTERNAL_LINKS.wikidata.baseUrl).toBe('https://www.wikidata.org/wiki');
	});

	it('contains wikipedia entry with label and baseUrl', () => {
		expect(EXTERNAL_LINKS.wikipedia.label).toBe('Wikipedia');
		expect(EXTERNAL_LINKS.wikipedia.baseUrl).toBe('https://en.wikipedia.org/wiki');
	});
});
