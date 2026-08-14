import { CHART_TYPES } from './chart-types.js';

/**
 * @typedef {Object} ExampleHighlight
 * @property {string} label
 * @property {string} value
 * @property {string} explanation
 */

/**
 * @typedef {Object} StratifyBuiltInExample
 * @property {string} slug
 * @property {'built-in'} sourceKind
 * @property {string} name
 * @property {import('./chart-types.js').ChartType} chartType
 * @property {string} purpose
 * @property {string} summary
 * @property {string} bestFor
 * @property {string} avoidWhen
 * @property {string[]} learningPoints
 * @property {ExampleHighlight[]} highlights
 * @property {Record<string, any>} snapshot
 */

/**
 * @typedef {Object} StratifyCommunityExample
 * @property {string} slug
 * @property {'community'} sourceKind
 * @property {string} chartId
 * @property {import('./chart-types.js').ChartType} chartType
 * @property {string} purpose
 * @property {string} summary
 * @property {string[]} learningPoints
 */

export const CHART_TYPE_GUIDANCE = {
	line: {
		label: 'Line chart',
		purpose: 'Show change over time',
		description: 'Connect ordered observations so trends, peaks and turning points are easy to see.'
	},
	scatter: {
		label: 'Scatterplot',
		purpose: 'Show relationships',
		description: 'Compare two numeric measures and optionally size points by a third measure.'
	},
	area: {
		label: 'Area chart',
		purpose: 'Emphasise magnitude over time',
		description: 'Use a filled time series when the amount and its change both matter.'
	},
	column: {
		label: 'Column chart',
		purpose: 'Compare categories',
		description: 'Compare a small set of category values on a shared vertical scale.'
	},
	'column-stacked': {
		label: 'Stacked columns',
		purpose: 'Show composition by category',
		description: 'Show how several components combine into a total for each category.'
	},
	'column-grouped': {
		label: 'Grouped columns',
		purpose: 'Compare series within categories',
		description:
			'Place related values side by side when direct comparisons matter more than totals.'
	},
	bar: {
		label: 'Bar chart',
		purpose: 'Rank categories',
		description: 'Use horizontal bars for long labels or a ranked list.'
	},
	'bar-stacked': {
		label: 'Stacked bars',
		purpose: 'Compare composition',
		description: 'Show parts of a total while leaving room for longer category labels.'
	},
	'bar-grouped': {
		label: 'Grouped bars',
		purpose: 'Compare category groups',
		description: 'Compare multiple values side by side with readable horizontal labels.'
	},
	waterfall: {
		label: 'Waterfall',
		purpose: 'Explain a change',
		description:
			'Walk from a starting value through positive and negative contributions to a total.'
	},
	'waterfall-horizontal': {
		label: 'Horizontal waterfall',
		purpose: 'Explain a change with long labels',
		description: 'Use the waterfall story with extra room for descriptive contribution labels.'
	},
	map: {
		label: 'Map',
		purpose: 'Show where things are',
		description: 'Plot latitude and longitude, then use size or colour to show another measure.'
	}
};

/** @param {string} chartType */
export function getChartTypeGuidance(chartType) {
	return /** @type {Record<string, {label: string, purpose: string, description: string}>} */ (
		CHART_TYPE_GUIDANCE
	)[chartType];
}

/** @type {StratifyBuiltInExample[]} */
export const builtInExamples = [
	{
		slug: 'wind-generation-range',
		sourceKind: 'built-in',
		name: 'Wind generation and availability',
		chartType: 'line',
		purpose: 'Show a trend with an expected range',
		summary:
			'Compare generation with availability over time and add a shaded minimum-to-maximum band.',
		bestFor:
			'Time series where uncertainty, availability or a normal range adds important context.',
		avoidWhen: 'The horizontal values are unordered categories rather than dates or numbers.',
		learningPoints: [
			'Use ISO dates with an Australian UTC offset.',
			'Choose two visible Y series and reserve two columns for the shaded range.',
			'Show date and time in the tooltip when observations occur within a day.'
		],
		highlights: [
			{
				label: 'Chart type',
				value: 'Line chart',
				explanation: 'Connected points make the time trend clear.'
			},
			{
				label: 'Range band',
				value: 'Generation min → Generation max',
				explanation: 'The two range columns are shaded and excluded from the visible series.'
			},
			{
				label: 'Tooltip date',
				value: 'Date + time',
				explanation: 'Shows the full en-AU timestamp for each observation.'
			}
		],
		snapshot: {
			chartType: 'line',
			displayMode: 'time-series',
			title: 'Wind generation and availability',
			description: 'Illustrative generation, availability and operating range over three days.',
			dataSource: 'Open Electricity illustrative data',
			notes: 'Synthetic data for demonstrating line ranges.',
			xLabel: 'Date / time (NEM time)',
			yLabel: 'MW',
			lineRangeMinColumn: 'generation_min',
			lineRangeMaxColumn: 'generation_max',
			lineRangeOpacity: 0.18,
			tooltipDateFormat: 'date-time',
			userSeriesColours: { generation: '#5b9f7b', availability: '#b44b38' },
			csvText: `Date / time,Generation,Availability,Generation min,Generation max
2026-07-01T00:00:00+10:00,7500,7700,7100,7900
2026-07-01T06:00:00+10:00,7200,7500,6800,7700
2026-07-01T12:00:00+10:00,6400,6800,6000,7100
2026-07-01T18:00:00+10:00,9000,9400,8500,9700
2026-07-02T00:00:00+10:00,10300,10800,9700,11100
2026-07-02T06:00:00+10:00,8500,10700,8000,11000
2026-07-02T12:00:00+10:00,7200,9500,6700,9900
2026-07-02T18:00:00+10:00,8200,9200,7600,9600
2026-07-03T00:00:00+10:00,9800,10300,9200,10600
2026-07-03T06:00:00+10:00,8100,10000,7500,10400
2026-07-03T12:00:00+10:00,7700,8500,7100,8900
2026-07-03T18:00:00+10:00,6900,7200,6300,7600`
		}
	},
	{
		slug: 'temperature-demand-bubbles',
		sourceKind: 'built-in',
		name: 'Temperature and electricity demand',
		chartType: 'scatter',
		purpose: 'Compare related numeric measures',
		summary: 'Use bubble size to add total NEM demand to a temperature-versus-demand comparison.',
		bestFor: 'Relationships, clusters and outliers across two or three numeric measures.',
		avoidWhen: 'You need to show a continuous sequence or imply that one point follows another.',
		learningPoints: [
			'Choose linear display mode for a numeric X axis.',
			'Use multiple Y series to compare regions.',
			'Size every point from one shared numeric column.'
		],
		highlights: [
			{
				label: 'X axis',
				value: 'Linear temperature',
				explanation: 'Numeric spacing is preserved instead of treating temperatures as labels.'
			},
			{
				label: 'Bubble size',
				value: 'NEM demand',
				explanation: 'A square-root scale keeps bubble areas perceptually useful.'
			},
			{
				label: 'Point opacity',
				value: '70%',
				explanation: 'Overlapping points remain visible.'
			}
		],
		snapshot: {
			chartType: 'scatter',
			displayMode: 'linear',
			title: 'Illustrative electricity demand by mean temperature',
			description:
				'Synthetic comparison of NSW and Victorian demand, with bubble size representing total NEM demand.',
			dataSource: 'Open Electricity illustrative data',
			notes: 'Synthetic data; values are not observations.',
			xLabel: 'Mean temperature (°C)',
			yLabel: 'Demand (MW)',
			scatterSizeColumn: 'nem_demand_mw',
			scatterMinRadius: 3,
			scatterMaxRadius: 18,
			scatterPointOpacity: 0.7,
			csvText: `Mean temperature (°C),NSW demand (MW),VIC demand (MW),NEM demand (MW)
14,6900,4700,21100
16,7100,4900,21800
18,7350,5100,22600
20,7600,5350,23400
22,7900,5600,24300
24,8350,5900,25500
26,8900,6300,27000
28,9600,6900,29100
30,10400,7600,31600
32,11300,8400,34400
34,12100,9200,37100`
		}
	},
	{
		slug: 'renewables-area',
		sourceKind: 'built-in',
		name: 'Renewable generation over time',
		chartType: 'area',
		purpose: 'Emphasise changing magnitude',
		summary: 'Use a filled series to make the growth in renewable generation visually prominent.',
		bestFor: 'A small number of time series where magnitude matters as much as the trend.',
		avoidWhen: 'Several filled series overlap and make individual values difficult to compare.',
		learningPoints: [
			'Use dates in the first column.',
			'Keep the number of overlapping areas small.'
		],
		highlights: [
			{
				label: 'Chart type',
				value: 'Area chart',
				explanation: 'The fill emphasises the amount above zero.'
			},
			{
				label: 'Colour',
				value: 'Renewables green',
				explanation: 'A meaningful series colour makes the subject easy to identify.'
			}
		],
		snapshot: {
			chartType: 'area',
			displayMode: 'time-series',
			title: 'Renewable generation is growing',
			description: 'Illustrative annual renewable electricity generation.',
			dataSource: 'Open Electricity illustrative data',
			yLabel: 'Generation (GWh)',
			userSeriesColours: { renewables: '#2c7629' },
			csvText: `Year,Renewables
2018-01-01,42000
2019-01-01,47800
2020-01-01,55200
2021-01-01,63600
2022-01-01,72400
2023-01-01,81100
2024-01-01,90600
2025-01-01,100800`
		}
	},
	{
		slug: 'battery-capacity-column',
		sourceKind: 'built-in',
		name: 'Battery capacity by state',
		chartType: 'column',
		purpose: 'Compare category values',
		summary: 'Compare one measure across a short list of states.',
		bestFor: 'A small number of categories with short labels.',
		avoidWhen: 'Category labels are long or there are too many bars to scan comfortably.',
		learningPoints: [
			'Use category display mode.',
			'Start the value axis at zero for honest comparison.'
		],
		highlights: [
			{
				label: 'Display mode',
				value: 'Category',
				explanation: 'State names are labels, not a numeric scale.'
			},
			{
				label: 'Y axis',
				value: 'Starts at zero',
				explanation: 'Bar length remains proportional to capacity.'
			}
		],
		snapshot: {
			chartType: 'column',
			displayMode: 'category',
			title: 'Registered battery capacity by state',
			dataSource: 'Open Electricity illustrative data',
			yLabel: 'Capacity (MW)',
			y1Min: 0,
			userSeriesColours: { capacity_mw: '#4e79a7' },
			csvText: `State,Capacity (MW)
NSW,4200
VIC,3100
QLD,2750
SA,1900
TAS,450`
		}
	},
	{
		slug: 'generation-mix-stacked-columns',
		sourceKind: 'built-in',
		name: 'Generation mix by state',
		chartType: 'column-stacked',
		purpose: 'Compare totals and composition',
		summary: 'Show how generation sources contribute to each state total.',
		bestFor: 'Parts that add to a meaningful total across a few categories.',
		avoidWhen:
			'Precise comparison of every segment matters; only the baseline segment is easy to compare.',
		learningPoints: [
			'Each numeric column becomes one stack segment.',
			'Order and colours carry meaning.'
		],
		highlights: [
			{
				label: 'Chart type',
				value: 'Stacked columns',
				explanation: 'Segments add to a state total.'
			},
			{
				label: 'Palette',
				value: 'Open Electricity energy',
				explanation: 'Fuel technologies use familiar energy colours.'
			}
		],
		snapshot: {
			chartType: 'column-stacked',
			displayMode: 'category',
			title: 'Electricity generation mix by state',
			dataSource: 'Open Electricity illustrative data',
			yLabel: 'Generation (GWh)',
			csvText: `State,Coal,Gas,Wind,Solar,Hydro
NSW,10200,4800,3600,5200,2900
VIC,4500,3900,4800,2800,2400
QLD,8400,6200,2400,6800,700
SA,0,2800,3200,3100,0
TAS,0,400,600,200,2600`
		}
	},
	{
		slug: 'prices-grouped-columns',
		sourceKind: 'built-in',
		name: 'Quarterly prices by region',
		chartType: 'column-grouped',
		purpose: 'Compare several series within categories',
		summary: 'Place regional prices side by side for each quarter.',
		bestFor: 'Direct comparison of two to four series across a small set of categories.',
		avoidWhen: 'There are many series or categories; the groups will become crowded.',
		learningPoints: [
			'Every numeric column becomes a bar in each group.',
			'Keep the legend concise.'
		],
		highlights: [
			{
				label: 'Chart type',
				value: 'Grouped columns',
				explanation: 'Regional values share the same category baseline.'
			},
			{
				label: 'Legend',
				value: 'Shown',
				explanation: 'The colour key identifies each region.'
			}
		],
		snapshot: {
			chartType: 'column-grouped',
			displayMode: 'category',
			title: 'Quarterly wholesale electricity prices',
			dataSource: 'Open Electricity illustrative data',
			yLabel: 'Average price ($/MWh)',
			csvText: `Quarter,NSW,VIC,QLD
Q1 2025,92,76,88
Q2 2025,71,62,69
Q3 2025,105,91,98
Q4 2025,84,73,80`
		}
	},
	{
		slug: 'facilities-ranked-bars',
		sourceKind: 'built-in',
		name: 'Largest wind farms',
		chartType: 'bar',
		purpose: 'Rank categories with long names',
		summary: 'Use horizontal bars so facility names remain readable.',
		bestFor: 'Ranked values and categories with long labels.',
		avoidWhen: 'The order represents time; use a line or column chart instead.',
		learningPoints: ['Sort the CSV in the intended reading order.', 'Use one clear measure.'],
		highlights: [
			{
				label: 'Chart type',
				value: 'Bar chart',
				explanation: 'Horizontal space accommodates facility names.'
			},
			{
				label: 'Value label',
				value: 'Capacity (MW)',
				explanation: 'The axis states exactly what bar length means.'
			}
		],
		snapshot: {
			chartType: 'bar',
			displayMode: 'category',
			title: 'Largest illustrative wind farms',
			dataSource: 'Open Electricity illustrative data',
			xLabel: 'Capacity (MW)',
			userSeriesColours: { capacity_mw: '#2c7629' },
			csvText: `Facility,Capacity (MW)
Southern Plains Wind Farm,1450
Golden Ridge Renewable Energy Hub,1180
Coastal Range Wind Project,960
Western Tablelands Wind Farm,820
Riverina Wind Energy Centre,710`
		}
	},
	{
		slug: 'energy-share-stacked-bars',
		sourceKind: 'built-in',
		name: 'Renewable and fossil shares',
		chartType: 'bar-stacked',
		purpose: 'Compare composition with long labels',
		summary: 'Show renewable and fossil generation as parts of each region total.',
		bestFor: 'Composition comparisons where category labels need horizontal room.',
		avoidWhen: 'The components do not combine into a meaningful total.',
		learningPoints: ['Use consistent component order.', 'Use semantic series colours.'],
		highlights: [
			{
				label: 'Chart type',
				value: 'Stacked bars',
				explanation: 'Each bar shows the region total and its components.'
			},
			{
				label: 'Series colours',
				value: 'Renewable green, fossil brown',
				explanation: 'Semantic colours reduce legend lookup.'
			}
		],
		snapshot: {
			chartType: 'bar-stacked',
			displayMode: 'category',
			title: 'Generation by broad source',
			dataSource: 'Open Electricity illustrative data',
			xLabel: 'Generation (GWh)',
			userSeriesColours: { renewables: '#2c7629', fossil_fuels: '#5b4636' },
			csvText: `Region,Renewables,Fossil fuels
New South Wales,11200,18500
Victoria,10400,9200
Queensland,9900,17400
South Australia,7200,2800
Tasmania,4600,400`
		}
	},
	{
		slug: 'battery-cycles-grouped-bars',
		sourceKind: 'built-in',
		name: 'Battery cycles by cohort',
		chartType: 'bar-grouped',
		purpose: 'Compare cohorts with long labels',
		summary: 'Compare two facility cohorts side by side without truncating names.',
		bestFor: 'A few series compared across categories with descriptive labels.',
		avoidWhen: 'There are enough groups to create a dense wall of bars.',
		learningPoints: ['Use blanks for unavailable values.', 'Label cohorts in plain language.'],
		highlights: [
			{
				label: 'Chart type',
				value: 'Grouped bars',
				explanation: 'The two cohorts share a baseline for each facility.'
			},
			{
				label: 'Missing data',
				value: 'Blank cells',
				explanation: 'A missing observation is not treated as zero.'
			}
		],
		snapshot: {
			chartType: 'bar-grouped',
			displayMode: 'category',
			title: 'Illustrative daily battery cycle rates',
			dataSource: 'Open Electricity illustrative data',
			xLabel: 'Cycles per day',
			csvText: `Facility,Earlier cohort,Recent cohort
Wandoan South,0.95,
Bouldercombe,0.82,
Chinchilla,0.72,0.68
Western Downs,0.98,0.90
Greenbank,,0.88
Tarong,0.28,0.35`
		}
	},
	{
		slug: 'wem-change-waterfall',
		sourceKind: 'built-in',
		name: 'Change in WEM generation',
		chartType: 'waterfall',
		purpose: 'Explain what caused a total to change',
		summary: 'Walk from one annual total to the next through fuel-specific changes.',
		bestFor: 'A starting value, signed contributions and a meaningful ending total.',
		avoidWhen: 'The values are independent categories rather than contributions to a change.',
		learningPoints: ['Put the starting total in the first row.', 'Use signed values for changes.'],
		highlights: [
			{
				label: 'Waterfall mode',
				value: 'Single series',
				explanation: 'Rows are accumulated in CSV order.'
			},
			{
				label: 'Show total',
				value: 'On',
				explanation: 'Stratify appends the ending value.'
			}
		],
		snapshot: {
			chartType: 'waterfall',
			displayMode: 'category',
			title: 'WEM generation change from 2025 to 2026',
			dataSource: 'Open Electricity illustrative data',
			yLabel: 'Generation (GWh)',
			waterfallShowTotal: true,
			waterfallColourMode: 'semantic',
			userSeriesLabels: { Total: 'May 2026' },
			csvText: `Contribution,Generation (GWh)
May 2025,1718.3
Coal,-158.0
Wind,-26.4
Gas,216.5
Solar,8.1
Other,3.9`
		}
	},
	{
		slug: 'project-cost-waterfall-horizontal',
		sourceKind: 'built-in',
		name: 'Project cost bridge',
		chartType: 'waterfall-horizontal',
		purpose: 'Explain change with descriptive labels',
		summary: 'Use a horizontal waterfall when contribution labels need more room.',
		bestFor: 'Change stories whose contribution names are too long for a vertical axis.',
		avoidWhen: 'You need to compare many independent values.',
		learningPoints: [
			'Keep contribution labels specific.',
			'Use positive and negative values deliberately.'
		],
		highlights: [
			{
				label: 'Orientation',
				value: 'Horizontal',
				explanation: 'Long contribution names remain readable.'
			},
			{
				label: 'Colours',
				value: 'Semantic',
				explanation: 'Increases and decreases are visually distinct.'
			}
		],
		snapshot: {
			chartType: 'waterfall-horizontal',
			displayMode: 'category',
			title: 'Illustrative project cost bridge',
			dataSource: 'Open Electricity illustrative data',
			xLabel: 'Cost ($m)',
			waterfallShowTotal: true,
			userSeriesLabels: { Total: 'Revised estimate' },
			csvText: `Contribution,Cost ($m)
Original estimate,840
Network connection works,95
Equipment savings,-42
Construction escalation,68
Financing improvement,-21`
		}
	},
	{
		slug: 'renewable-project-map',
		sourceKind: 'built-in',
		name: 'Renewable projects map',
		chartType: 'map',
		purpose: 'Show location, size and type',
		summary: 'Map project locations, size markers by capacity and colour them by technology.',
		bestFor: 'Rows with valid latitude and longitude where geographic pattern matters.',
		avoidWhen: 'Location is incidental or precise value comparison is the main task.',
		learningPoints: [
			'Map latitude and longitude explicitly.',
			'Use size and colour for different fields.'
		],
		highlights: [
			{
				label: 'Marker size',
				value: 'Capacity',
				explanation: 'Larger projects receive larger markers.'
			},
			{
				label: 'Marker colour',
				value: 'Technology',
				explanation: 'Categories use separate colours.'
			}
		],
		snapshot: {
			chartType: 'map',
			displayMode: 'category',
			title: 'Illustrative renewable energy projects',
			description: 'Marker size represents capacity and colour represents technology.',
			dataSource: 'Open Electricity illustrative data',
			latColumn: 'latitude',
			lngColumn: 'longitude',
			labelColumn: 'project',
			sizeColumn: 'capacity_mw',
			colourColumn: 'technology',
			mapColourMode: 'category',
			mapMinRadius: 5,
			mapMaxRadius: 24,
			csvText: `Project,Latitude,Longitude,Capacity (MW),Technology
New England Solar Hub,-30.52,151.67,720,Solar
Western Plains Wind Farm,-32.91,147.38,980,Wind
Riverina Battery,-34.76,146.55,500,Battery
Gippsland Wind Project,-38.02,147.10,1250,Wind
Darling Downs Solar Farm,-27.46,151.21,460,Solar
Spencer Gulf Battery,-32.74,137.84,300,Battery`
		}
	}
];

/** @type {StratifyCommunityExample[]} */
export const curatedCommunityExamples = [
	{
		slug: 'community-battery-discharge-trend',
		sourceKind: 'community',
		chartId: 'ltTHEMfGigqGkSSsjDvphJ',
		chartType: 'line',
		purpose: 'Show a rolling trend',
		summary: 'A published community line chart showing rolling 12-month battery discharge.',
		learningPoints: [
			'Use a rolling total to reveal a structural trend.',
			'Remove the legend for one series.'
		]
	},
	{
		slug: 'community-battery-discharge-column',
		sourceKind: 'community',
		chartId: 'hZyNkFNJ5RJ70G2cCYU41x',
		chartType: 'column',
		purpose: 'Compare facility totals',
		summary: 'A published comparison of discharge from Queensland batteries.',
		learningPoints: [
			'Use columns for a small facility comparison.',
			'State the measurement period.'
		]
	},
	{
		slug: 'community-gas-usage-stacked',
		sourceKind: 'community',
		chartId: 'V7i4kv6WPmWtd1xOiBdnpe',
		chartType: 'column-stacked',
		purpose: 'Show a distribution by category',
		summary: 'A published stacked-column view of South Australian gas usage.',
		learningPoints: [
			'Use a stacked chart for cumulative shares.',
			'Label the value axis with its unit.'
		]
	},
	{
		slug: 'community-wa-coal-waterfall',
		sourceKind: 'community',
		chartId: '4oahX6D1W7tC3OhVpJNG9M',
		chartType: 'waterfall',
		purpose: 'Explain replacement generation',
		summary: 'A published waterfall explaining how gas and other sources filled a coal decline.',
		learningPoints: ['Use signed contributions.', 'Write a title that states the finding.']
	},
	{
		slug: 'community-wind-performance-map',
		sourceKind: 'community',
		chartId: 'fE8QdfQNGkyHcTQCvEL3sY',
		chartType: 'map',
		purpose: 'Show geographic performance',
		summary: 'A published map of wind-farm performance on a selected day.',
		learningPoints: [
			'Use geography only when location helps explain the pattern.',
			'Keep map encodings focused.'
		]
	}
];

/**
 * Backwards-compatible list used by the empty builder and existing tests.
 * @type {Array<StratifyBuiltInExample & {csvData: string, title: string, description: string, dataSource: string, notes: string}>}
 */
export const examples = builtInExamples.map((example) => ({
	...example,
	csvData: example.snapshot.csvText,
	title: example.snapshot.title ?? example.name,
	description: example.snapshot.description ?? example.summary,
	dataSource: example.snapshot.dataSource ?? '',
	notes: example.snapshot.notes ?? ''
}));

/** @param {string} slug */
export function getBuiltInExample(slug) {
	return builtInExamples.find((example) => example.slug === slug) ?? null;
}

/** @param {string} slug */
export function getCommunityExample(slug) {
	return curatedCommunityExamples.find((example) => example.slug === slug) ?? null;
}

export function validateExampleCatalogue() {
	const errors = [];
	const slugs = [...builtInExamples, ...curatedCommunityExamples].map((example) => example.slug);
	if (new Set(slugs).size !== slugs.length) errors.push('Example slugs must be unique.');

	const supportedTypes = new Set(CHART_TYPES.map((type) => type.value));
	for (const example of [...builtInExamples, ...curatedCommunityExamples]) {
		if (!supportedTypes.has(example.chartType)) {
			errors.push(`${example.slug}: unsupported chart type "${example.chartType}".`);
		}
	}

	for (const type of supportedTypes) {
		if (!builtInExamples.some((example) => example.chartType === type)) {
			errors.push(`Missing built-in example for "${type}".`);
		}
	}

	for (const example of builtInExamples) {
		if (!example.snapshot.csvText?.trim()) errors.push(`${example.slug}: CSV data is required.`);
		if (example.snapshot.chartType !== example.chartType) {
			errors.push(`${example.slug}: snapshot chart type does not match catalogue chart type.`);
		}
	}

	return errors;
}
