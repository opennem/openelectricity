import { describe, it, expect } from 'vitest';
import {
	ALL_COMPARISON_CHARTS,
	COMPARISON_CHART_OPTIONS,
	selectComparisonCharts,
	comparisonFuelRows,
	processComparisonFinancial,
	processComparisonFlows,
	comparisonMetricValue
} from './comparison-metrics.js';
import {
	aggregateComparison,
	applyRegionComparison,
	normaliseRegionComparison,
	parseRegionComparison,
	sumComparisonNetworks
} from './region-comparison.js';
const stamp = '2024-01-01T00:00:00+10:00';
/** @param {string} metric @param {Record<string, number|null>} values @returns {any} */
const response = (metric, values) => ({
	data: [
		{
			metric,
			results: Object.entries(values).map(([fueltech, value]) => ({
				columns: { fueltech },
				data: [[stamp, value]]
			}))
		}
	]
});
describe('expanded regional metrics', () => {
	it('defaults to intensity and renewable proportion and round-trips selections', () => {
		expect(ALL_COMPARISON_CHARTS).toHaveLength(21);
		expect(COMPARISON_CHART_OPTIONS).toHaveLength(14);
		expect(normaliseRegionComparison().charts).toEqual(['intensity', 'share']);
		expect(
			normaliseRegionComparison({ charts: ['intensity', 'generation', 'share'] }).charts
		).toEqual(['intensity', 'generation']);
		expect(selectComparisonCharts(['share', 'wind_share'], ['generation'])).toEqual([
			'generation',
			'wind_share'
		]);
		for (const charts of [undefined, [], ['solar_value', 'price', 'unknown']]) {
			const state = normaliseRegionComparison({ charts });
			const params = new URLSearchParams();
			applyRegionComparison(params, state);
			expect(parseRegionComparison(params).charts).toEqual(state.charts);
		}
	});
	it('offers one price chart, defaults to adjusted and preserves nominal selections', () => {
		const prices = COMPARISON_CHART_OPTIONS.filter((metric) => metric.group === 'Prices');
		expect(prices).toHaveLength(6);
		expect(
			prices.filter((metric) => metric.label === 'Volume-weighted price').map((metric) => metric.id)
		).toEqual(['price_real']);
		expect(selectComparisonCharts(['price_real'])).toEqual(['price_real']);
		expect(selectComparisonCharts(['price_real'], ['price'])).toEqual(['price']);
		for (const charts of [
			['price'],
			['price_real'],
			['price', 'price_real'],
			['price_real', 'price']
		]) {
			const state = normaliseRegionComparison({ charts });
			expect(state.charts).toEqual([charts[0]]);
			const params = new URLSearchParams();
			applyRegionComparison(params, state);
			expect(parseRegionComparison(params).charts).toEqual(state.charts);
		}
	});
	it('combines solar, wind, gas and coal technologies and preserves explicit gaps', () => {
		const row = comparisonFuelRows(
			response('energy', {
				solar_rooftop: 10,
				solar_utility: 20,
				wind: 30,
				wind_offshore: 40,
				gas_ccgt: 50,
				gas_ocgt: 60,
				coal_black: 70,
				coal_brown: 80,
				battery: 999
			}),
			'energy'
		)[0];
		expect(row).toMatchObject({
			solar_energy: 30,
			wind_energy: 70,
			gas_energy: 110,
			coal_energy: 150,
			hydro_energy: 0
		});
		expect(comparisonMetricValue({ ...row, demand_gross: 50 }, 'solar_wind_share', 'demand')).toBe(
			200
		);
		expect(
			comparisonFuelRows(
				response('energy', { solar_rooftop: null, solar_utility: 20 }),
				'energy'
			)[0].solar_energy
		).toBeNull();
	});
	it('does not bridge an unreported observation inside a technology history', () => {
		const raw = response('energy', { solar_rooftop: 10, solar_utility: 20 });
		raw.data[0].results[0].data.push(['2024-03-01T00:00:00+10:00', 30]);
		raw.data[0].results[1].data.push(['2024-02-01T00:00:00+10:00', 20]);
		expect(comparisonFuelRows(raw, 'energy')[1].solar_energy).toBeNull();
	});
	it('weights prices by energy after complete annual aggregation, including negative prices', () => {
		const rows = Array.from({ length: 12 }, (_, i) => ({
			time: Date.UTC(2024, i),
			solar_energy: i ? 100 : 10,
			solar_market_value: i ? 1000 : -1000,
			energy_mwh: i ? 100 : 10,
			market_value: i ? 1000 : -1000
		}));
		const row = aggregateComparison(rows, '1y', Date.UTC(2025, 0))[0];
		expect(comparisonMetricValue(row, 'solar_value', 'demand')).toBeCloseTo(10000 / 1110);
		expect(comparisonMetricValue(rows[0], 'price', 'demand')).toBe(-100);
		expect(
			comparisonMetricValue({ solar_energy: 0, solar_market_value: 10 }, 'solar_value', 'demand')
		).toBeNull();
	});
	it('uses signed net imports over gross demand, independently of generation-share basis', () => {
		const raw = {
			data: [
				...response('flow_imports_energy', { imports: 100 }).data,
				...response('flow_exports_energy', { exports: 250 }).data
			]
		};
		const row = processComparisonFlows(raw).data[0];
		expect(
			comparisonMetricValue({ ...row, demand_gross: 1000 }, 'net_imports_share', 'generation')
		).toBe(-15);
	});
	it('sums national market value and energy components before dividing', () => {
		const a = processComparisonFinancial(response('market_value', { wind: 1000, battery: 999 }))
			?.data[0];
		const b = { ...a, market_value: 9000, wind_market_value: 9000 };
		const row = sumComparisonNetworks(
			[{ ...a, energy_mwh: 10, wind_energy: 10 }],
			[{ ...b, energy_mwh: 90, wind_energy: 90 }]
		)[0];
		expect(comparisonMetricValue(row, 'price', 'demand')).toBe(100);
		expect(comparisonMetricValue(row, 'wind_value', 'demand')).toBe(100);
	});
});
