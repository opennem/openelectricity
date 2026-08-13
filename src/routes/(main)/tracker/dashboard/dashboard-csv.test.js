import { describe, expect, it } from 'vitest';
import { buildLongDashboardCsv, buildWidePanelCsv } from './dashboard-csv.js';

const dataset = {
	key: 'price-1',
	title: 'Price, NSW',
	type: 'price',
	metric: 'price',
	data: [{ time: Date.UTC(2026, 7, 13), price: 42.5, missing: null }],
	seriesNames: ['price', 'missing'],
	seriesLabels: { price: 'Spot "price"', missing: 'Missing' }
};

describe('Tracker dashboard CSV export', () => {
	it('builds escaped long-form rows and skips absent values', () => {
		const csv = buildLongDashboardCsv([dataset], '+10:00');
		expect(csv).not.toBeNull();
		if (!csv) return;
		expect(csv).toContain('"Price, NSW"');
		expect(csv).toContain('"Spot ""price"""');
		expect(csv).toContain('$/MWh');
		expect(csv.split('\n')).toHaveLength(2);
	});

	it('builds panel-wide data and returns null for partial/unavailable panels', () => {
		const csv = buildWidePanelCsv(dataset, '+10:00');
		expect(csv).not.toBeNull();
		expect(csv).toContain('"Spot ""price"" ($/MWh)"');
		expect(buildWidePanelCsv({ ...dataset, data: [] }, '+10:00')).toBeNull();
		expect(buildLongDashboardCsv([], '+10:00')).toBeNull();
	});
});
