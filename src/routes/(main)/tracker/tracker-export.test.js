import { describe, it, expect } from 'vitest';
import {
	buildExportDataset,
	buildExportDatasets,
	buildWorkbookSheets,
	datasetToCsv,
	datasetToSheet,
	exportFileName,
	headerFor,
	sheetName,
	summaryRows,
	trackerDownloadItems
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
				emissionsT: null,
				intensityKgPerMWh: null,
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
				emissionsT: 1234.5,
				intensityKgPerMWh: 900.2,
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
		hiddenSeries: ['coal'],
		pending: false,
		sourceUrl: 'https://openelectricity.org.au/tracker',
		generatedAtMs: T0 + 2 * HOUR,
		...overrides
	};
}

describe('trackerDownloadItems', () => {
	it('offers the table only while its panel is open', () => {
		expect(trackerDownloadItems({ tablePanelOpen: true }).map((item) => item.key)).toEqual([
			'generation',
			'market',
			'emissions',
			'table'
		]);
		expect(trackerDownloadItems({ tablePanelOpen: false }).map((item) => item.key)).toEqual([
			'generation',
			'market',
			'emissions'
		]);
	});
});

describe('headerFor', () => {
	it('appends the unit unless the label already carries one', () => {
		expect(headerFor('Coal', 'MW')).toBe('Coal (MW)');
		expect(headerFor('Price ($/MWh)', '$/MWh')).toBe('Price ($/MWh)');
	});
});

describe('buildExportDataset', () => {
	it('labels generation columns by basis and keeps loads negative', () => {
		const power = buildExportDataset('generation', context());
		expect(power?.columns.map((column) => column.header)).toEqual([
			'date',
			'Coal (MW)',
			'Solar, utility (MW)',
			'Pumps (MW)'
		]);
		expect(power?.rows[0].pumps).toBe(-5);
		const energy = buildExportDataset('generation', context({ basis: 'energy' }));
		expect(energy?.columns[1].header).toBe('Coal (MWh)');
	});

	it('returns null while a snapshot is missing', () => {
		expect(buildExportDataset('generation', context({ generation: null }))).toBeNull();
		expect(buildExportDataset('market', context({ price: null }))).toBeNull();
		expect(buildExportDataset('table', context({ tablePanelOpen: false }))).toBeNull();
	});

	it('exports spot price and market value as delivered', () => {
		const spot = buildExportDataset('market', context());
		expect(spot?.columns.map((column) => column.header)).toEqual(['date', 'Price ($/MWh)']);
		const mv = buildExportDataset(
			'market',
			context({
				priceMetric: 'market_value',
				price: {
					data: [{ time: T0, coal: 1000 }],
					seriesNames: ['coal'],
					seriesLabels: { coal: 'Coal' }
				}
			})
		);
		expect(mv?.columns[1].header).toBe('Coal ($)');
	});

	it('derives the volume-weighted price and keeps its components', () => {
		const vw = buildExportDataset(
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
		expect(vw?.columns.map((column) => column.header)).toEqual([
			'date',
			'Volume-weighted price ($/MWh)',
			'Market value ($)',
			'Energy (MWh)'
		]);
		expect(vw?.rows[0].vw_price).toBe(100);
		expect(vw?.rows[1].vw_price).toBeNull();
	});

	it('derives intensity in kg/MWh and exports volume as delivered', () => {
		const intensity = buildExportDataset('emissions', context());
		expect(intensity?.columns[1].header).toBe('Emissions intensity (kgCO2e/MWh)');
		expect(intensity?.rows[0].intensity).toBe(500);
		expect(intensity?.rows[1].intensity).toBeNull();

		const volume = buildExportDataset(
			'emissions',
			context({
				emissionsMetric: 'emissions',
				emissions: {
					data: [{ time: T0, coal: 12 }],
					seriesNames: ['coal'],
					seriesLabels: { coal: 'Coal' }
				}
			})
		);
		expect(volume?.columns[1].header).toBe('Coal (tCO2e)');
	});

	it('lays the table out as sources, loads, curtailment then summaries', () => {
		const table = buildExportDataset('table', context());
		expect(table?.rows.map((row) => [row.label, row.type])).toEqual([
			['Coal', 'source'],
			['Pumps', 'load'],
			['Solar', 'curtailment'],
			['Demand', 'summary'],
			['Renewables', 'summary']
		]);
		expect(table?.columns.map((column) => column.header)).toContain('Contribution (% generation)');
		expect(table?.rows[0].fuelTechs).toBe('coal_black coal_brown');
		expect(table?.rows[0].hidden).toBe(true);
		expect(table?.columns.slice(2, 4).map((column) => column.header)).toEqual([
			'Energy (MWh)',
			'Av power (MW)'
		]);
	});
});

describe('buildExportDatasets', () => {
	it('collects every available dataset in menu order', () => {
		expect(buildExportDatasets(context()).map((dataset) => dataset.key)).toEqual([
			'generation',
			'market',
			'emissions',
			'table'
		]);
		expect(
			buildExportDatasets(context({ price: null, tablePanelOpen: false })).map((d) => d.key)
		).toEqual(['generation', 'emissions']);
	});
});

describe('datasetToCsv', () => {
	it('writes network-local timestamps, escaped headers and empty cells for gaps', () => {
		const csv = datasetToCsv(
			/** @type {any} */ (buildExportDataset('generation', context())),
			'+10:00'
		);
		expect(csv.split('\n')).toEqual([
			'date,Coal (MW),"Solar, utility (MW)",Pumps (MW)',
			'2026-07-01 14:30:00+10:00,100.5,20,-5',
			'2026-07-01 15:30:00+10:00,110,,-6'
		]);
	});

	it('serialises table strings and booleans', () => {
		const csv = datasetToCsv(/** @type {any} */ (buildExportDataset('table', context())), '+10:00');
		expect(csv.split('\n')[1]).toBe(
			'Coal,source,210.5,105.25,83.4,88.1,1234.5,900.2,true,coal_black coal_brown'
		);
		expect(csv.split('\n')[4]).toBe('Demand,summary,240,120,,,,,,');
	});
});

describe('datasetToSheet', () => {
	it('writes a bold frozen header and Excel date serials in wall time', () => {
		const sheet = datasetToSheet(
			/** @type {any} */ (buildExportDataset('generation', context())),
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

describe('sheetName', () => {
	it('strips illegal characters and caps the length', () => {
		expect(sheetName('Fuel tech: table?')).toBe('Fuel tech table');
		expect(sheetName('x'.repeat(40))).toHaveLength(31);
		expect(sheetName('[]')).toBe('Sheet');
	});
});

describe('summaryRows / buildWorkbookSheets', () => {
	it('describes the export and lists hidden groups', () => {
		const rows = Object.fromEntries(summaryRows(context()));
		expect(rows.Region).toBe('NEM');
		expect(rows.Timezone).toContain('AEST (UTC+10:00)');
		expect(rows.Market).toBe('Spot price ($/MWh)');
		expect(rows.Emissions).toBe('Intensity (kgCO2e/MWh)');
		expect(rows['Hidden groups']).toContain('Coal');
		expect(rows.Generated).toBe('2026-07-01 16:30:00+10:00');
		expect(Object.fromEntries(summaryRows(context({ hiddenSeries: [] })))).not.toHaveProperty(
			'Hidden groups'
		);
	});

	it('puts the Summary sheet first', () => {
		const sheets = buildWorkbookSheets(context());
		expect(sheets.map((sheet) => sheet.sheet)).toEqual([
			'Summary',
			'Generation',
			'Market',
			'Emissions',
			'Fuel tech table'
		]);
	});
});

describe('exportFileName', () => {
	it('names files by region, dataset and range', () => {
		expect(exportFileName(context(), 'generation')).toBe('tracker-nem-generation-3d.csv');
		expect(exportFileName(context({ region: 'nsw1' }), 'xlsx')).toBe('tracker-nsw1-3d.xlsx');
		expect(
			exportFileName(context({ region: 'au', rangeSlug: '2026-01-01-to-2026-02-01' }), 'table')
		).toBe('tracker-au-table-2026-01-01-to-2026-02-01.csv');
	});
});
