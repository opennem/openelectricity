import { expect, it } from 'vitest';
import { chartImageMetadata } from './image-metadata.js';

const chart = {
	title: 'Generation',
	seriesData: [{ time: 0, wind: 1 }],
	chartOptions: { displayUnit: 'MW' },
	visibleSeriesNames: ['wind'],
	seriesLabels: { wind: 'Wind' },
	seriesColours: { wind: '#123456' },
	displayOverlayLines: [{ id: 'demand', label: 'Demand', colour: '#333', tooltipUnit: 'MW' }],
	displayOverlayAreas: [{ series: [{ id: 'curtailment', colour: '#aaa' }] }]
};
it('exports visible series and overlay labels without data', () => {
	expect(chartImageMetadata(/** @type {any} */ (chart))).toEqual({
		hasData: true,
		title: 'Generation',
		unit: 'MW',
		transform: '',
		legend: [
			{ label: 'Wind', colour: '#123456' },
			{ label: 'Demand (MW)', colour: '#333' },
			{ label: 'curtailment', colour: '#aaa' }
		]
	});
});
it('marks empty frames as unavailable even when axes remain mounted', () => {
	expect(chartImageMetadata(/** @type {any} */ ({ ...chart, seriesData: [] })).hasData).toBe(false);
});
it('uses the active percentage basis instead of absolute units', () => {
	expect(
		chartImageMetadata(
			/** @type {any} */ ({
				...chart,
				chartOptions: { isDataTransformTypeProportion: true },
				proportionContext: { label: '% demand' }
			})
		).unit
	).toBe('% demand');
});
it('labels change-since charts', () => {
	expect(
		chartImageMetadata(
			/** @type {any} */ ({ ...chart, chartOptions: { isDataTransformTypeChangeSince: true } })
		).transform
	).toBe('Change since start');
});
