import { describe, expect, it } from 'vitest';
import { CHART_TYPES } from './chart-types.js';
import {
	builtInExamples,
	curatedCommunityExamples,
	getBuiltInExample,
	getCommunityExample,
	validateExampleCatalogue
} from './example-catalogue.js';
import { parseCSV } from './csv-parser.js';

describe('Stratify example catalogue', () => {
	it('is valid and has a built-in example for every chart type', () => {
		expect(validateExampleCatalogue()).toEqual([]);
		expect(new Set(builtInExamples.map((example) => example.chartType))).toEqual(
			new Set(CHART_TYPES.map((type) => type.value))
		);
	});

	it('uses unique slugs across built-in and community examples', () => {
		const slugs = [...builtInExamples, ...curatedCommunityExamples].map((example) => example.slug);
		expect(new Set(slugs).size).toBe(slugs.length);
	});

	it('provides parseable data and lookup helpers', () => {
		for (const example of builtInExamples) {
			const parsed = parseCSV(
				example.snapshot.csvText,
				{},
				example.snapshot.displayMode ?? 'auto',
				example.snapshot.xColumn || 0
			);
			expect(parsed.errors, example.slug).toEqual([]);
			expect(parsed.data.length, example.slug).toBeGreaterThan(0);
			expect(getBuiltInExample(example.slug)).toBe(example);
		}

		expect(getBuiltInExample('missing')).toBeNull();
		expect(getCommunityExample(curatedCommunityExamples[0].slug)).toBe(curatedCommunityExamples[0]);
		expect(getCommunityExample('missing')).toBeNull();
	});
});
