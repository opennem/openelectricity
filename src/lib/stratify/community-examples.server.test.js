import { describe, expect, it, vi } from 'vitest';
import {
	fetchCuratedCommunityChart,
	fetchCuratedCommunityCharts
} from './community-examples.server.js';
import { curatedCommunityExamples } from './example-catalogue.js';

describe('curated community documentation queries', () => {
	it('requests all curated IDs and returns the published results', async () => {
		const charts = [{ _id: curatedCommunityExamples[0].chartId }];
		const client = { fetch: vi.fn().mockResolvedValue(charts) };
		expect(await fetchCuratedCommunityCharts(client)).toBe(charts);
		expect(client.fetch).toHaveBeenCalledWith(expect.stringContaining('status == "published"'), {
			ids: curatedCommunityExamples.map((example) => example.chartId)
		});
	});

	it('only fetches a single chart while it remains published', async () => {
		const chart = { _id: 'chart-1' };
		const client = { fetch: vi.fn().mockResolvedValue(chart) };
		expect(await fetchCuratedCommunityChart('chart-1', client)).toBe(chart);
		expect(client.fetch).toHaveBeenCalledWith(expect.stringContaining('status == "published"'), {
			id: 'chart-1'
		});
	});
});
