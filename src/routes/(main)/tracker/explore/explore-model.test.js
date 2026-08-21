import { describe, expect, it } from 'vitest';
import {
	MAX_COMPARISON_FACILITIES,
	createExploreChart,
	defaultExploreConfig,
	exploreRecipeSupportsScope,
	normaliseExploreRange,
	validateExploreConfig
} from './explore-model.js';

const facilities = [
	{ code: 'A', network_id: 'NEM', units: [{ code: 'A1' }] },
	{ code: 'B', network_id: 'NEM', units: [{ code: 'B1' }] },
	{ code: 'W', network_id: 'WEM', units: [{ code: 'W1' }] }
];

describe('Explore chart model', () => {
	it('uses the approved Generation defaults', () => {
		expect(defaultExploreConfig('generation')).toEqual({
			presentation: 'chart',
			scope: '_all',
			range: { days: 7, intervalId: '30m' },
			group: 'simple'
		});
	});

	it('supports metric output while keeping facility comparison chart-only', () => {
		expect(defaultExploreConfig('demand', 'metric').presentation).toBe('metric');
		expect(
			validateExploreConfig(
				'facility-comparison',
				{ presentation: 'metric', networkId: 'NEM', facilityCodes: ['A', 'B'] },
				facilities
			).errors
		).toContain('This query is available as a chart only.');
	});

	it('keeps intervals compatible with the selected range', () => {
		expect(normaliseExploreRange({ days: 30, intervalId: '5m' })).toEqual({
			days: 30,
			intervalId: '1d'
		});
	});

	it('removes unsupported national scopes from regional-only recipes', () => {
		expect(validateExploreConfig('price', { scope: 'au' }).config?.scope).toBe('_all');
		expect(validateExploreConfig('flows', { scope: '_all' }).config?.scope).toBe('nsw1');
		expect(
			validateExploreConfig('renewables', { scope: 'au', renewableMeasure: 'share' }).config?.scope
		).toBe('_all');
		expect(
			validateExploreConfig('renewables', { scope: 'au', renewableMeasure: 'generation' }).config
				?.scope
		).toBe('au');
		expect(
			validateExploreConfig('renewables', {
				presentation: 'metric',
				scope: 'au',
				renewableMeasure: 'share',
				includeStorage: true
			}).config?.scope
		).toBe('au');
		expect(
			validateExploreConfig('renewables', {
				presentation: 'metric',
				renewableMeasure: 'share',
				includeStorage: true
			}).config?.includeStorage
		).toBe(false);
	});

	it('reports shared-region compatibility without coercing the view', () => {
		expect(exploreRecipeSupportsScope('generation', {}, 'au')).toBe(true);
		expect(exploreRecipeSupportsScope('price', {}, 'au')).toBe(false);
		expect(exploreRecipeSupportsScope('flows', {}, '_all')).toBe(false);
		expect(exploreRecipeSupportsScope('flows', {}, 'nsw1')).toBe(true);
		expect(
			exploreRecipeSupportsScope(
				'renewables',
				{ presentation: 'metric', renewableMeasure: 'share' },
				'au'
			)
		).toBe(true);
	});

	it('requires one facility for a unit chart', () => {
		const result = validateExploreConfig(
			'facility',
			{ networkId: 'NEM', facilityCodes: [] },
			facilities
		);
		expect(result.errors).toEqual(['Choose one facility.']);
	});

	it('requires same-network facilities and caps comparison size', () => {
		const more = Array.from({ length: 10 }, (_, index) => ({
			code: `N${index}`,
			network_id: 'NEM'
		}));
		const result = validateExploreConfig(
			'facility-comparison',
			{ networkId: 'NEM', facilityCodes: [...more.map((item) => item.code), 'W'] },
			[...facilities, ...more]
		);
		expect(result.config?.facilityCodes).toHaveLength(MAX_COMPARISON_FACILITIES);
		expect(result.config?.facilityCodes).not.toContain('W');
	});

	it('does not create an invalid facility chart', () => {
		expect(
			createExploreChart('chart-1', 'facility', defaultExploreConfig('facility'), facilities)
		).toBeNull();
	});
});
