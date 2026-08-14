import { describe, expect, it } from 'vitest';
import {
	buildDocumentationCatalogue,
	resolveDocumentationExample,
	summariseChartConfiguration
} from './example-docs.js';
import { builtInExamples, curatedCommunityExamples } from './example-catalogue.js';

describe('Stratify documentation examples', () => {
	it('normalises every built-in example for rendering and template loading', () => {
		const catalogue = buildDocumentationCatalogue();
		expect(catalogue).toHaveLength(builtInExamples.length);
		expect(catalogue[0]).toMatchObject({
			sourceKind: 'built-in',
			href: expect.stringContaining('/stratify/docs/examples/'),
			templateHref: expect.stringContaining('/stratify/new?template='),
			chart: { chartType: expect.any(String), csvText: expect.any(String) }
		});
	});

	it('only adds curated community definitions with a published chart result', () => {
		const definition = curatedCommunityExamples[0];
		const catalogue = buildDocumentationCatalogue([
			{
				_id: definition.chartId,
				title: 'Community title',
				chartType: 'line',
				csvText: 'Date,Value\n2026-01-01,10'
			}
		]);
		const community = catalogue.filter((example) => example.sourceKind === 'community');
		expect(community).toHaveLength(1);
		expect(community[0]).toMatchObject({
			slug: definition.slug,
			name: 'Community title',
			communityHref: `/strata/${definition.chartId}`
		});
	});

	it('summarises only relevant non-default chart settings', () => {
		expect(
			summariseChartConfiguration({
				chartType: 'scatter',
				displayMode: 'linear',
				scatterSizeColumn: 'demand',
				tooltipDateFormat: 'date'
			})
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ label: 'Chart type', value: 'Scatterplot' }),
				expect.objectContaining({ label: 'X values', value: 'Linear number' }),
				expect.objectContaining({ label: 'Bubble size', value: 'demand' })
			])
		);
	});

	it('resolves built-in examples and rejects missing ones', () => {
		expect(resolveDocumentationExample(builtInExamples[0].slug)?.slug).toBe(
			builtInExamples[0].slug
		);
		expect(resolveDocumentationExample('missing')).toBeNull();
	});
});
