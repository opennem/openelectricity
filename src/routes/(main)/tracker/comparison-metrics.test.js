import { describe, it, expect } from 'vitest';
import {
	ALL_COMPARISON_CHARTS,
	COMPARISON_CHART_OPTIONS,
	selectComparisonCharts,
	comparisonFuelRows,
	processComparisonFinancial,
	processComparisonFlows,
	comparisonMetricValue,
	comparisonChartId,
	comparisonPresentation,
	comparisonPresentations,
	formatComparisonCell,
	comparisonChartUnits,
	comparisonTableColumn,
	comparisonUnit,
	normaliseComparisonResponse
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
		expect(ALL_COMPARISON_CHARTS).toHaveLength(24);
		expect(COMPARISON_CHART_OPTIONS).toHaveLength(15);
		expect(normaliseRegionComparison().charts).toEqual(['intensity', 'renewables_share']);
		// Renewables' earlier ids still select their charts.
		expect(
			normaliseRegionComparison({ charts: ['intensity', 'generation', 'share'] }).charts
		).toEqual(['intensity', 'renewables_generation']);
		// Chosen charts keep their current presentations…
		expect(
			selectComparisonCharts(['renewables_share', 'wind_share'], ['renewables_generation'])
		).toEqual(['renewables_generation', 'wind_share']);
		// …and one shown again returns in the presentation remembered for it,
		expect(
			selectComparisonCharts(['renewables_share'], [], {
				renewables_share: 'renewables_generation'
			})
		).toEqual(['renewables_generation']);
		// unless the memory belongs to another chart.
		expect(
			selectComparisonCharts(['renewables_share'], [], { renewables_share: 'wind_generation' })
		).toEqual(['renewables_share']);
		for (const charts of [undefined, [], ['solar_value', 'price', 'unknown']]) {
			const state = normaliseRegionComparison({ charts });
			const params = new URLSearchParams();
			applyRegionComparison(params, state);
			expect(parseRegionComparison(params).charts).toEqual(state.charts);
		}
	});
	it('charts emissions volume in kt, cycling kt / Mt / t in the table', () => {
		const row = { emissions: 4_250_000, energy_mwh: 5_000_000 };
		expect(comparisonMetricValue(row, 'emissions', 'demand')).toBe(4_250_000);
		expect(comparisonMetricValue({ emissions: null }, 'emissions', 'demand')).toBeNull();
		expect(comparisonUnit('emissions', 'demand')).toBe('ktCO₂e');
		expect(comparisonUnit('emissions', 'demand', true)).toBe('tCO₂e');
		expect(formatComparisonCell(4_250_000, 'emissions', {})).toBe('4,250');
		expect(formatComparisonCell(4_250_000, 'emissions', { emissions: 'M' })).toBe('4.3');
		expect(formatComparisonCell(62_000, 'emissions', {})).toBe('62');
		expect(comparisonTableColumn('emissions', 'demand', {})).toMatchObject({
			unit: 'ktCO₂e',
			nextUnit: 'MtCO₂e'
		});
		expect(comparisonChartUnits('emissions')).toMatchObject({ prefix: '', display: 'k' });
		const emissions = COMPARISON_CHART_OPTIONS.find((option) => option.id === 'emissions');
		expect(emissions).toMatchObject({ group: 'Emissions', label: 'Volume' });
	});
	it('formats Regions table cells as the fuel-tech table formats the same values', () => {
		expect(formatComparisonCell(42, 'renewables_share', {})).toBe('42.0%');
		expect(formatComparisonCell(-3.25, 'net_imports_share', {})).toBe('-3.3%');
		expect(formatComparisonCell(85.3, 'price_real', {})).toBe('$85.30');
		expect(formatComparisonCell(null, 'price', {})).toBe('—');
		expect(formatComparisonCell(250, 'intensity', {})).toBe('250');
	});
	it('offers renewables excluding batteries as a presentation of the one renewables chart', () => {
		const row = {
			renewables: 1200,
			demand_gross: 2000,
			solar_energy: 400,
			wind_energy: 300,
			hydro_energy: 250,
			bioenergy_energy: 50
		};
		// Official counts battery discharge; excluding batteries sums the renewable fuel techs.
		expect(comparisonMetricValue(row, 'renewables_generation', 'demand')).toBe(1200);
		expect(comparisonMetricValue(row, 'renewables_generation_ex_batteries', 'demand')).toBe(1000);
		expect(comparisonMetricValue(row, 'renewables_share_ex_batteries', 'demand')).toBe(50);
		expect(
			comparisonMetricValue(
				{ ...row, bioenergy_energy: null },
				'renewables_share_ex_batteries',
				'demand'
			)
		).toBeNull();
		expect(comparisonChartId('renewables_share_ex_batteries')).toBe('renewables_share');
		expect(comparisonChartId('renewables_generation_ex_batteries')).toBe('renewables_share');
		// Each axis switches on its own, keeping the others.
		expect(comparisonPresentation('renewables_share_ex_batteries', 'generation', true)).toBe(
			'renewables_generation_ex_batteries'
		);
		expect(comparisonPresentation('renewables_generation', 'exBatteries', true)).toBe(
			'renewables_generation_ex_batteries'
		);
		expect(comparisonPresentation('price_real', 'nominal', true)).toBe('price');
		// A presentation a chart lacks leaves the metric as it is.
		expect(comparisonPresentation('wind_generation', 'exBatteries', true)).toBe('wind_generation');
		expect(comparisonPresentations('renewables_share').map(({ key }) => key)).toEqual([
			'generation',
			'exBatteries'
		]);
		expect(comparisonPresentations('wind_share').map(({ key }) => key)).toEqual(['generation']);
		expect(comparisonPresentations('price_real').map(({ key }) => key)).toEqual(['nominal']);
		expect(comparisonPresentations('intensity')).toEqual([]);
		const state = normaliseRegionComparison({
			charts: ['intensity', 'renewables_generation_ex_batteries']
		});
		expect(state.charts).toEqual(['intensity', 'renewables_generation_ex_batteries']);
		const params = new URLSearchParams();
		applyRegionComparison(params, state);
		expect(params.get('compare-charts')).toBe('intensity,renewables-generation-ex-batteries');
		expect(parseRegionComparison(params).charts).toEqual(state.charts);
	});
	it('offers one price chart, defaults to adjusted and preserves nominal selections', () => {
		const prices = COMPARISON_CHART_OPTIONS.filter((metric) => metric.group === 'Prices');
		expect(prices).toHaveLength(6);
		// One chip for both: inflation adjusted by default, its title in full.
		expect(prices.filter((metric) => metric.label === 'VW price')).toMatchObject([
			{ id: 'price_real', title: 'Volume-weighted price' }
		]);
		expect(selectComparisonCharts(['price_real'], [])).toEqual(['price_real']);
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
		// A null between readings is a missing observation: the group is unknown.
		const gap = response('energy', { solar_rooftop: 10, solar_utility: 20 });
		gap.data[0].results[0].data.push(
			['2024-02-01T00:00:00+10:00', null],
			['2024-03-01T00:00:00+10:00', 30]
		);
		gap.data[0].results[1].data.push(
			['2024-02-01T00:00:00+10:00', 20],
			['2024-03-01T00:00:00+10:00', 20]
		);
		expect(
			comparisonFuelRows(normaliseComparisonResponse(gap), 'energy')[1].solar_energy
		).toBeNull();
	});
	it('treats the nulls padding a technology before it starts or after it retires as absent', () => {
		// As the API returns a new technology: a null month, then its first reading.
		const raw = response('energy', {
			solar_rooftop: 10,
			solar_utility: null,
			bioenergy_biomass: 5
		});
		raw.data[0].results[0].data.push(['2024-02-01T00:00:00+10:00', 12]);
		raw.data[0].results[1].data.push(['2024-02-01T00:00:00+10:00', 20]);
		raw.data[0].results[2].data.push(['2024-02-01T00:00:00+10:00', null]);
		const [january, february] = comparisonFuelRows(normaliseComparisonResponse(raw), 'energy');
		expect(january.solar_energy).toBe(10);
		expect(february.solar_energy).toBe(32);
		expect(february.bioenergy_energy).toBe(0);
		// A technology that idles (explicit zeros elsewhere) reports some idle
		// months as null too: those count as zero, not missing.
		const peaker = response('energy', { gas_ocgt: 0, gas_ccgt: 40 });
		peaker.data[0].results[0].data.push(
			['2024-02-01T00:00:00+10:00', null],
			['2024-03-01T00:00:00+10:00', 15]
		);
		peaker.data[0].results[1].data.push(
			['2024-02-01T00:00:00+10:00', 40],
			['2024-03-01T00:00:00+10:00', 40]
		);
		expect(
			comparisonFuelRows(normaliseComparisonResponse(peaker), 'energy').map((row) => row.gas_energy)
		).toEqual([40, 40, 55]);
		// A technology with no readings at all contributes nothing.
		expect(
			comparisonFuelRows(
				normaliseComparisonResponse(response('energy', { hydro: null, wind: 5 })),
				'energy'
			)[0].hydro_energy
		).toBe(0);
	});
	it('does not bridge an unreported observation inside a technology history', () => {
		const raw = response('energy', { solar_rooftop: 10, solar_utility: 20 });
		raw.data[0].results[0].data.push(['2024-03-01T00:00:00+10:00', 30]);
		raw.data[0].results[1].data.push(['2024-02-01T00:00:00+10:00', 20]);
		expect(
			comparisonFuelRows(normaliseComparisonResponse(raw), 'energy')[1].solar_energy
		).toBeNull();
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
