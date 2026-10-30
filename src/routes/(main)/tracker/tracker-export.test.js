import { describe, it, expect } from 'vitest';
import {
	buildWorkbookSheets,
	datasetToCsv,
	datasetToSheet
} from '$lib/components/charts/card/export-dataset.js';
import {
	exportFileName,
	timelineDataset,
	timelineSummaryRows,
	trackerFileName
} from './tracker-export.js';

/** @typedef {import('./types.js').TrackerExportContext} TrackerExportContext */

// 2026-07-01T04:30:00Z is 14:30 AEST (+10:00).
const T0 = Date.UTC(2026, 6, 1, 4, 30);
const HOUR = 3_600_000;

/** @param {Partial<TrackerExportContext>} [overrides] @returns {TrackerExportContext} */
function context(overrides = {}) {
	return {
		region: '_all',
		regionLabel: 'NEM',
		group: 'simple',
		groupLabel: 'Simplified',
		contributionMode: 'generation',
		basis: 'power',
		displayInterval: '5m',
		intervalLabel: '5 min',
		rangeLabel: '29 Jun – 1 Jul 2026',
		rangeSlug: '3d',
		timeZone: '+10:00',
		window: { start: T0 - HOUR, end: T0 + HOUR },
		priceMetric: 'price',
		emissionsMetric: 'emissions_intensity',
		generation: {
			data: [
				{ time: T0, coal: 100.5, solar: 20, pumps: -5 },
				{ time: T0 + HOUR, coal: 110, solar: null, pumps: -6 }
			],
			seriesNames: ['coal', 'solar', 'pumps'],
			seriesLabels: { coal: 'Coal', solar: 'Solar, utility', pumps: 'Pumps' }
		},
		price: {
			data: [
				{ time: T0, price: 85.2 },
				{ time: T0 + HOUR, price: 90 }
			],
			seriesNames: ['price'],
			seriesLabels: { price: 'Price ($/MWh)' }
		},
		emissions: {
			data: [
				{ time: T0, emissions: 50, energy_mwh: 100 },
				{ time: T0 + HOUR, emissions: 60, energy_mwh: 0 }
			],
			seriesNames: ['emissions', 'energy_mwh'],
			seriesLabels: { emissions: 'Emissions (t)', energy_mwh: 'Energy (MWh)' }
		},
		tableRows: [
			{
				id: 'pumps',
				label: 'Pumps',
				colour: '#000',
				isLoad: true,
				hidden: false,
				energyMWh: 11,
				avPowerMW: 5.5,
				contributionPct: null,
				vwPrice: 40,
				vwPricePartial: false,
				emissionsT: null,
				intensityKgPerMWh: null,
				intensityPartial: false,
				fuelTechs: ['pumps']
			},
			{
				id: 'coal',
				label: 'Coal',
				colour: '#000',
				isLoad: false,
				hidden: true,
				energyMWh: 210.5,
				avPowerMW: 105.25,
				contributionPct: 83.4,
				vwPrice: 88.1,
				vwPricePartial: true,
				emissionsT: 1234.5,
				intensityKgPerMWh: 900.2,
				intensityPartial: false,
				fuelTechs: ['coal_black', 'coal_brown']
			}
		],
		curtailmentRows: [
			{ id: 'curtailment_solar', label: 'Solar', energyMWh: 4, avPowerMW: 2, contributionPct: 1.5 }
		],
		overlaySummary: {
			demandEnergyMWh: 240,
			demandAvMW: 120,
			renewablesEnergyMWh: 40,
			renewablesAvMW: 20,
			renewablesSharePct: 16.7
		},
		tablePanelOpen: true,
		hiddenSeries: [],
		generationTransform: 'absolute',
		generationMeasure: 'energy',
		marketValueTransform: 'absolute',
		overlayLines: [],
		overlayAreas: [],
		rooftopForecast: false,
		...overrides
	};
}

/** @param {import('./types.js').ExportDataset | null} dataset */
const headers = (dataset) => dataset?.columns.map((column) => column.header);

describe('timelineDataset — Generation', () => {
	it('omits synthetic calendar-band closing points without changing source data', () => {
		const ctx = context();
		if (!ctx.generation) throw new Error('Missing fixture');
		ctx.generation.data.push({ time: T0 + 2 * HOUR, coal: 110, _bandClose: true });
		expect(timelineDataset('generation', ctx)?.rows).toHaveLength(2);
		expect(ctx.generation.data).toHaveLength(3);
	});

	it('labels columns by basis and keeps loads negative', () => {
		const power = timelineDataset('generation', context());
		expect(headers(power)).toEqual(['date', 'Coal (MW)', 'Solar, utility (MW)', 'Pumps (MW)']);
		expect(power?.rows[0].pumps).toBe(-5);
		const energy = timelineDataset('generation', context({ basis: 'energy' }));
		expect(energy?.columns[1].header).toBe('Coal (MWh)');
	});

	it('leaves out the series the table hides, as the stack does', () => {
		expect(headers(timelineDataset('generation', context({ hiddenSeries: ['coal'] })))).toEqual([
			'date',
			'Solar, utility (MW)',
			'Pumps (MW)'
		]);
		// Every series hidden: nothing is drawn, so nothing downloads.
		expect(
			timelineDataset('generation', context({ hiddenSeries: ['coal', 'solar', 'pumps'] }))
		).toBeNull();
	});

	it('appends the drawn overlays, joined on the stack’s times', () => {
		const ctx = context({
			overlayLines: [
				{
					id: 'demand',
					label: 'Demand',
					data: [{ time: T0, demand: 130 }],
					valueKey: 'demand',
					scale: 'y'
				},
				{
					id: 'renewable-share',
					label: 'Renewables',
					data: [
						{ time: T0, renewable_share: 15.5 },
						{ time: T0 + HOUR, renewable_share: 18 }
					],
					valueKey: 'renewable_share',
					scale: 'percent'
				}
			],
			overlayAreas: [
				{
					data: [{ date: new Date(T0 + HOUR), curtailment_solar: 7 }],
					series: [{ id: 'curtailment_solar', label: 'Curtailment (Solar)' }]
				}
			]
		});
		const generation = timelineDataset('generation', ctx);
		expect(headers(generation)).toEqual([
			'date',
			'Coal (MW)',
			'Solar, utility (MW)',
			'Pumps (MW)',
			'Demand (MW)',
			'Renewables (% of gross demand)',
			'Curtailment (Solar) (MW)'
		]);
		expect(
			datasetToCsv(/** @type {any} */ (generation), '+10:00')
				.split('\n')
				.slice(1)
		).toEqual([
			'2026-07-01 14:30:00+10:00,100.5,20,-5,130,15.5,',
			'2026-07-01 15:30:00+10:00,110,,-6,,18,7'
		]);
	});

	it('returns null while the snapshot is missing', () => {
		expect(timelineDataset('generation', context({ generation: null }))).toBeNull();
		expect(timelineDataset('market', context({ price: null }))).toBeNull();
		expect(timelineDataset('table', context({ tableRows: null }))).toBeNull();
	});
});

describe('timelineDataset — Market', () => {
	it('exports the spot price on the Price tab, whatever the table hides', () => {
		const spot = timelineDataset('market', context({ hiddenSeries: ['price'] }));
		expect(headers(spot)).toEqual(['date', 'Price ($/MWh)']);
	});

	it('exports the visible series on the Market value tab', () => {
		const price = {
			data: [{ time: T0, coal: 1000, solar: 50 }],
			seriesNames: ['coal', 'solar'],
			seriesLabels: { coal: 'Coal', solar: 'Solar' }
		};
		const mv = timelineDataset('market', context({ priceMetric: 'market_value', price }));
		expect(headers(mv)).toEqual(['date', 'Coal ($)', 'Solar ($)']);
		const shown = timelineDataset(
			'market',
			context({ priceMetric: 'market_value', price, hiddenSeries: ['coal'] })
		);
		expect(headers(shown)).toEqual(['date', 'Solar ($)']);
	});

	it('derives the volume-weighted price and keeps its components', () => {
		const vw = timelineDataset(
			'market',
			context({
				priceMetric: 'price_vw',
				price: {
					data: [
						{ time: T0, market_value: 5000, energy_mwh: 50 },
						{ time: T0 + HOUR, market_value: 100, energy_mwh: 0 }
					],
					seriesNames: ['market_value', 'energy_mwh'],
					seriesLabels: {}
				}
			})
		);
		expect(headers(vw)).toEqual([
			'date',
			'Volume-weighted price ($/MWh)',
			'Market value ($)',
			'Energy (MWh)'
		]);
		expect(vw?.rows[0].vw_price).toBe(100);
		expect(vw?.rows[1].vw_price).toBeNull();
	});
});

describe('timelineDataset — Emissions', () => {
	it('derives intensity in kg/MWh with its components on the Intensity tab', () => {
		const intensity = timelineDataset('emissions', context({ hiddenSeries: ['coal'] }));
		expect(headers(intensity)).toEqual([
			'date',
			'Emissions intensity (kgCO2e/MWh)',
			'Emissions (tCO2e)',
			'Energy (MWh)'
		]);
		expect(intensity?.rows[0].intensity).toBe(500);
		expect(intensity?.rows[1].intensity).toBeNull();
	});

	it('exports the visible series on the Volume tab', () => {
		const emissions = {
			data: [{ time: T0, coal: 12, gas: 3 }],
			seriesNames: ['coal', 'gas'],
			seriesLabels: { coal: 'Coal', gas: 'Gas' }
		};
		const volume = timelineDataset(
			'emissions',
			context({ emissionsMetric: 'emissions', emissions })
		);
		expect(headers(volume)).toEqual(['date', 'Coal (tCO2e)', 'Gas (tCO2e)']);
		const shown = timelineDataset(
			'emissions',
			context({ emissionsMetric: 'emissions', emissions, hiddenSeries: ['gas'] })
		);
		expect(headers(shown)).toEqual(['date', 'Coal (tCO2e)']);
	});
});

describe('timelineDataset — Fuel tech table', () => {
	it('lays the table out as sources, loads, curtailment then summaries', () => {
		const table = timelineDataset('table', context());
		expect(table?.rows.map((row) => [row.label, row.type])).toEqual([
			['Coal', 'source'],
			['Pumps', 'load'],
			['Solar', 'curtailment'],
			['Demand', 'summary'],
			['Renewables', 'summary']
		]);
		expect(headers(table)).toContain('Contribution (% generation)');
		expect(table?.rows[0].fuelTechs).toBe('coal_black coal_brown');
		expect(table?.rows[0].hidden).toBe(true);
		expect(table?.columns.slice(2, 4).map((column) => column.header)).toEqual([
			'Energy (MWh)',
			'Av power (MW)'
		]);
	});
});

describe('datasetToCsv', () => {
	it('writes network-local timestamps, escaped headers and empty cells for gaps', () => {
		const csv = datasetToCsv(
			/** @type {any} */ (timelineDataset('generation', context())),
			'+10:00'
		);
		expect(csv.split('\n')).toEqual([
			'date,Coal (MW),"Solar, utility (MW)",Pumps (MW)',
			'2026-07-01 14:30:00+10:00,100.5,20,-5',
			'2026-07-01 15:30:00+10:00,110,,-6'
		]);
	});

	it('serialises table strings and booleans', () => {
		const csv = datasetToCsv(/** @type {any} */ (timelineDataset('table', context())), '+10:00');
		expect(csv.split('\n')[1]).toBe(
			'Coal,source,210.5,105.25,83.4,88.1,true,1234.5,900.2,false,true,coal_black coal_brown'
		);
		expect(csv.split('\n')[4]).toBe('Demand,summary,240,120,,,,,,,,');
	});
});

describe('datasetToSheet', () => {
	it('writes a bold frozen header and Excel date serials in wall time', () => {
		const sheet = datasetToSheet(
			/** @type {any} */ (timelineDataset('generation', context())),
			'+10:00'
		);
		expect(sheet.sheet).toBe('Generation');
		expect(sheet.stickyRowsCount).toBe(1);
		expect(sheet.data[0][0]).toEqual({ value: 'date', type: String, fontWeight: 'bold' });
		// 2026-07-01 14:30 local → serial day 46204 + 14.5/24
		expect(sheet.data[1][0]?.value).toBeCloseTo(46204 + 14.5 / 24, 9);
		expect(sheet.data[1][0]?.format).toBe('yyyy-mm-dd hh:mm');
		expect(sheet.data[1][1]).toEqual({ value: 100.5, type: Number });
		expect(sheet.data[2][2]).toBeNull();
	});
});

describe('timelineSummaryRows', () => {
	it('describes the charts and lists hidden groups', () => {
		const rows = Object.fromEntries(timelineSummaryRows(context({ hiddenSeries: ['coal'] })));
		expect(rows.View).toBe('Timeline');
		expect(rows.Region).toBe('NEM');
		expect(rows.Timezone).toContain('AEST (UTC+10:00)');
		expect(rows.Market).toBe('Spot price ($/MWh)');
		expect(rows.Emissions).toBe('Intensity (kgCO2e/MWh)');
		expect(rows['Hidden groups']).toContain('Coal');
		expect(Object.fromEntries(timelineSummaryRows(context()))).not.toHaveProperty('Hidden groups');
	});

	it('notes overlays, transforms and the rooftop forecast', () => {
		const rows = Object.fromEntries(
			timelineSummaryRows(
				context({
					generationTransform: 'proportion',
					rooftopForecast: true,
					overlayAreas: [
						{ data: [], series: [{ id: 'curtailment_wind', label: 'Curtailment (Wind)' }] }
					]
				})
			)
		);
		expect(rows['Generation overlays']).toBe('Curtailment (Wind)');
		expect(rows['Generation view']).toContain('base units');
		expect(rows['Rooftop forecast']).toContain('not exported');
	});

	it('notes average power only while the chart draws it', () => {
		const measure = (/** @type {'energy' | 'averagePower'} */ generationMeasure) =>
			Object.fromEntries(timelineSummaryRows(context({ generationMeasure })))['Generation measure'];
		expect(measure('averagePower')).toContain('exported as energy');
		expect(measure('energy')).toBeUndefined();
	});
});

describe('buildWorkbookSheets', () => {
	it('puts Summary first, then a uniquely named sheet per dataset', () => {
		const generation = /** @type {any} */ (timelineDataset('generation', context()));
		const sheets = buildWorkbookSheets({
			summary: [['View', 'Timeline']],
			datasets: [generation, { ...generation, title: 'generation' }],
			timeZone: '+10:00'
		});
		expect(sheets.map((sheet) => sheet.sheet)).toEqual(['Summary', 'Generation', 'generation (2)']);
		expect(sheets[0].data[0][1]).toEqual({ value: 'Timeline', type: String });
	});
});

describe('exportFileName', () => {
	it('names every tracker download the same way', () => {
		expect(
			trackerFileName({
				scope: '_all',
				dataset: 'time-of-day power',
				range: '2026-09-10',
				extension: 'csv'
			})
		).toBe('tracker-nem-time-of-day-power-2026-09-10.csv');
		expect(
			trackerFileName({ scope: 'regions', dataset: '12mr', range: '', extension: 'xlsx' })
		).toBe('tracker-regions-12mr-range.xlsx');
	});
	it('names files by region, dataset and range', () => {
		expect(exportFileName(context(), 'generation')).toBe('tracker-nem-generation-3d.csv');
		expect(exportFileName(context({ region: 'nsw1' }), 'xlsx')).toBe('tracker-nsw1-3d.xlsx');
		expect(
			exportFileName(context({ region: 'au', rangeSlug: '2026-01-01-to-2026-02-01' }), 'table')
		).toBe('tracker-au-table-2026-01-01-to-2026-02-01.csv');
	});
});
