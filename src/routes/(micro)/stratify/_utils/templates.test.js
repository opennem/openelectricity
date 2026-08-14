import { describe, expect, it, vi } from 'vitest';
import StratifyPlotProject from '../_state/StratifyPlotProject.svelte.js';
import { curatedCommunityExamples } from '$lib/stratify/example-catalogue.js';
import { loadExampleTemplate } from './templates.js';

describe('Stratify example templates', () => {
	it('loads a built-in example without fetching or persisting', async () => {
		const project = new StratifyPlotProject();
		const fetchChart = vi.fn();

		expect(await loadExampleTemplate(project, 'wind-generation-range', fetchChart)).toBe(true);
		expect(fetchChart).not.toHaveBeenCalled();
		expect(project.currentChartId).toBeNull();
		expect(project.status).toBe('draft');
		expect(project.chartType).toBe('line');
		expect(project.csvText).toContain('Generation min');
	});

	it('loads a community chart into a clean unsaved project', async () => {
		const project = new StratifyPlotProject();
		const definition = curatedCommunityExamples[0];
		const fetchChart = vi.fn().mockResolvedValue({
			_id: definition.chartId,
			userId: 'source-user',
			status: 'published',
			title: 'Published source',
			csvText: 'Date,Value\n2026-01-01,10',
			chartType: 'line'
		});

		expect(await loadExampleTemplate(project, definition.slug, fetchChart)).toBe(true);
		expect(fetchChart).toHaveBeenCalledWith(definition.chartId);
		expect(project.currentChartId).toBeNull();
		expect(project.status).toBe('draft');
		expect(project.toJSON()).not.toHaveProperty('_id');
		expect(project.toJSON()).not.toHaveProperty('userId');
	});

	it('returns false for an unknown template', async () => {
		const project = new StratifyPlotProject();
		expect(await loadExampleTemplate(project, 'missing', vi.fn())).toBe(false);
	});
});
