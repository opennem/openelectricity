// @ts-nocheck
import { describe, expect, it } from 'vitest';
import {
	MAX_PANELS,
	addPanel,
	builtinLayout,
	createPanel,
	createSavedDashboard,
	dashboardSignature,
	duplicatePanel,
	movePanel,
	resizePanel,
	validatePanels
} from './dashboard-model.js';

describe('Tracker dashboard model', () => {
	it('provides the analysis-first layout', () => {
		expect(builtinLayout().panels.map((panel) => panel.type)).toEqual([
			'metrics',
			'generation',
			'price',
			'emissions'
		]);
	});

	it('validates size tokens, IDs, singletons and the panel limit', () => {
		const candidates = [
			{ instanceId: 'map-1', type: 'map', width: 'half', height: 'huge' },
			{ instanceId: 'map-2', type: 'map' },
			{ instanceId: 'map-1', type: 'price' },
			...Array.from({ length: 20 }, (_, index) => createPanel(`price-${index}`, 'price'))
		];
		const panels = validatePanels(candidates);
		expect(panels).toHaveLength(MAX_PANELS);
		expect(panels[0]).toMatchObject({ type: 'map', width: 'full', height: 'tall' });
		expect(panels.filter((panel) => panel.type === 'map')).toHaveLength(1);
	});

	it('enforces duplicate and singleton rules', () => {
		const base = builtinLayout().panels;
		expect(addPanel(base, createPanel('metrics-2', 'metrics'))).toEqual(base);
		expect(duplicatePanel(base, 'analysis-metrics', 'metrics-2')).toEqual(base);
		const duplicated = duplicatePanel(base, 'analysis-price', 'price-2');
		expect(duplicated.at(-1)).toMatchObject({ instanceId: 'price-2', type: 'price' });
	});

	it('moves and resizes panels within constraints', () => {
		const base = builtinLayout().panels;
		expect(movePanel(base, 'analysis-price', -1).map((panel) => panel.type)).toEqual([
			'metrics',
			'price',
			'generation',
			'emissions'
		]);
		expect(resizePanel(base, 'analysis-price', { width: 'full', height: 'tall' })[2]).toMatchObject(
			{
				width: 'full',
				height: 'tall'
			}
		);
	});

	it('builds stable saved snapshots and dirty signatures', () => {
		const input = {
			id: 'view-1',
			name: ' My view ',
			region: '_all',
			group: 'detailed',
			range: { kind: 'preset', days: 7, intervalId: '30m' },
			panels: builtinLayout().panels,
			now: '2026-08-13T00:00:00.000Z'
		};
		const saved = createSavedDashboard(input);
		expect(saved).toMatchObject({ name: 'My view', createdAt: input.now, updatedAt: input.now });
		expect(dashboardSignature(saved)).toBe(dashboardSignature({ ...saved, name: 'Renamed' }));
	});
});
