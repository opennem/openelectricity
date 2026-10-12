import { describe, expect, it } from 'vitest';
import { seriesLegendItems } from './chart-legend.js';

const snapshot = {
	seriesNames: ['coal', 'solar', 'wind'],
	seriesLabels: { coal: 'Coal', solar: 'Solar', wind: 'Wind' },
	seriesColours: { coal: '#111', solar: '#fd0', wind: '#2a2' }
};

describe('seriesLegendItems', () => {
	it('keys the visible series from the top of the stack down', () => {
		expect(seriesLegendItems({ snapshot, hidden: ['solar'] })).toEqual([
			{ id: 'wind', label: 'Wind', colour: '#2a2' },
			{ id: 'coal', label: 'Coal', colour: '#111' }
		]);
	});

	it('adds overlay lines, then curtailment bands', () => {
		const items = seriesLegendItems({
			snapshot,
			hidden: ['coal', 'solar', 'wind'],
			lines: [{ id: 'demand', label: 'Demand', colour: '#000' }],
			areas: [
				{ series: [{ id: 'curtailment_solar', label: 'Curtailment (Solar)', colour: '#fe0' }] }
			]
		});
		expect(items).toEqual([
			{ id: 'overlay:demand', label: 'Demand', colour: '#000', line: true },
			{ id: 'curtailment_solar', label: 'Curtailment (Solar)', colour: '#fe0' }
		]);
	});

	it('is empty before the chart has data', () => {
		expect(seriesLegendItems({ snapshot: null })).toEqual([]);
	});
});
