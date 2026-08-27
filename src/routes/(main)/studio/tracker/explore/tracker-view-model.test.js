import { describe, expect, it } from 'vitest';
import {
	TRACKER_VIEW_SCHEMA_URL,
	createDefaultTrackerControls,
	createDefaultTrackerCharts,
	createDefaultTrackerViewSnapshot,
	createTrackerViewSnapshot,
	effectiveTrackerColumns,
	materialiseTrackerViewSnapshot,
	moveTrackerChart,
	parseTrackerViewJSON,
	updateTrackerChartLayout
} from './tracker-view-model.js';

const facilities = [
	{ code: 'A', name: 'Alpha', network_id: 'NEM', units: [{ code: 'A1' }] },
	{ code: 'B', name: 'Beta', network_id: 'NEM', units: [{ code: 'B1' }] }
];

/** @returns {any} */
function snapshot() {
	return {
		$schema: TRACKER_VIEW_SCHEMA_URL,
		kind: 'tracker-view',
		version: 1,
		name: 'Test view',
		description: '',
		controls: createDefaultTrackerControls(),
		layout: { columns: 2 },
		items: [
			{
				id: 'generation-1',
				recipeId: 'generation',
				presentation: 'chart',
				query: { scope: '_all', range: { days: 7, intervalId: '30m' }, group: 'simple' },
				layout: { columnSpan: 2, heightPx: 420 }
			}
		]
	};
}

describe('tracker view snapshots', () => {
	it('provides the default 7-day, 30-minute market overview', () => {
		const charts = /** @type {any[]} */ (createDefaultTrackerCharts());
		expect(charts.map((chart) => [chart.recipeId, chart.config.emissionsMode])).toEqual([
			['generation', undefined],
			['emissions', 'volume'],
			['emissions', 'intensity'],
			['price', undefined]
		]);
		expect(charts.every((chart) => chart.config.presentation === 'chart')).toBe(true);
		expect(charts.every((chart) => chart.config.range.days === 7)).toBe(true);
		expect(charts.every((chart) => chart.config.range.intervalId === '30m')).toBe(true);
		expect(charts.every((chart) => chart.layout.columnSpan === 1)).toBe(true);
		const defaultView = createDefaultTrackerViewSnapshot();
		expect(defaultView.name).toBe('Overview');
		expect(defaultView.controls.mode).toBe('shared');
		expect(defaultView.layout.columns).toBe(1);
		expect(defaultView.items).toHaveLength(4);
	});

	it('round trips the exact portable contract', () => {
		const materialised = materialiseTrackerViewSnapshot(snapshot(), facilities);
		expect(materialised.errors).toEqual([]);
		expect(
			createTrackerViewSnapshot({
				name: materialised.snapshot.name,
				description: materialised.snapshot.description,
				columns: materialised.snapshot.layout.columns,
				controls: materialised.snapshot.controls,
				charts: materialised.charts
			})
		).toEqual(snapshot());
	});

	it('loads earlier v1 snapshots without controls in individual mode', () => {
		const value = snapshot();
		delete value.controls;
		const result = materialiseTrackerViewSnapshot(value, facilities);
		expect(result.errors).toEqual([]);
		expect(result.snapshot.version).toBe(1);
		expect(result.snapshot.controls.mode).toBe('individual');
		expect(result.snapshot.items[0].query).toEqual(value.items[0].query);
	});

	it('round trips custom shared ranges and fuel visibility', () => {
		const value = snapshot();
		value.controls = {
			mode: 'shared',
			shared: {
				scope: 'nsw1',
				range: {
					kind: 'custom',
					start: '2026-07-01T00:00:00.000Z',
					end: '2026-07-08T00:00:00.000Z',
					intervalId: '30m'
				},
				group: 'detailed',
				hiddenFuelTechGroups: ['coal_black']
			}
		};
		const result = materialiseTrackerViewSnapshot(value, facilities);
		expect(result.errors).toEqual([]);
		expect(result.snapshot.controls).toEqual(value.controls);
	});

	it('rejects shared controls that cannot drive every card', () => {
		const value = snapshot();
		value.controls.shared.scope = 'au';
		value.items[0].recipeId = 'price';
		const result = materialiseTrackerViewSnapshot(value, facilities);
		expect(result.snapshot).toBeNull();
		expect(result.errors).toContain(
			'The shared region is not compatible with every card in this view.'
		);
	});

	it('rejects unknown fields and duplicate card IDs atomically', () => {
		const value = snapshot();
		value.items.push({ ...value.items[0] });
		value.extra = true;
		const result = materialiseTrackerViewSnapshot(value, facilities);
		expect(result.snapshot).toBeNull();
		expect(result.charts).toEqual([]);
		expect(result.errors.join(' ')).toContain('Unknown view field');
	});

	it('reports malformed JSON without changing state', () => {
		expect(parseTrackerViewJSON('{ nope', facilities).errors).toEqual([
			'Paste valid JSON before importing.'
		]);
	});

	it('keeps a missing facility as an unavailable repairable card', () => {
		const value = snapshot();
		value.items = [
			{
				id: 'facility-1',
				recipeId: 'facility',
				presentation: 'chart',
				query: {
					scope: '_all',
					range: { days: 7, intervalId: '30m' },
					group: 'simple',
					networkId: 'NEM',
					facilityCodes: ['MISSING'],
					unitCodes: []
				},
				layout: { columnSpan: 1, heightPx: 420 }
			}
		];
		const result = materialiseTrackerViewSnapshot(value, facilities);
		expect(result.errors).toEqual([]);
		expect(result.charts[0].config.facilityCodes).toEqual(['MISSING']);
		expect(result.charts[0].unavailableErrors).toEqual(['Choose one facility.']);
	});
});

describe('tracker view layout', () => {
	it('resolves the configured maximum responsively', () => {
		expect(effectiveTrackerColumns(3, 500)).toBe(1);
		expect(effectiveTrackerColumns(3, 900)).toBe(2);
		expect(effectiveTrackerColumns(3, 1400)).toBe(3);
	});

	it('moves and clamps card layout values', () => {
		const charts = [
			{ instanceId: 'a', recipeId: 'generation', config: { presentation: 'chart' } },
			{ instanceId: 'b', recipeId: 'price', config: { presentation: 'chart' } }
		];
		expect(moveTrackerChart(charts, 'b', -1).map((chart) => chart.instanceId)).toEqual(['b', 'a']);
		expect(
			updateTrackerChartLayout(charts, 'a', { columnSpan: 3, heightPx: 999 })[0].layout
		).toEqual({
			columnSpan: 3,
			heightPx: 720
		});
	});
});
