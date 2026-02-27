/**
 * Example datasets for Stratify.
 * Each example pre-populates the builder with CSV data, metadata, and a chart type.
 */

/**
 * @typedef {Object} StratifyExample
 * @property {string} name
 * @property {string} chartType - 'stacked-area' | 'area' | 'line'
 * @property {string} title
 * @property {string} description
 * @property {string} dataSource
 * @property {string} notes
 * @property {string} csvData
 */

/** @type {StratifyExample[]} */
export const examples = [
	{
		name: 'AU electricity generation (stacked area)',
		chartType: 'stacked-area',
		title: 'Australian electricity generation by source',
		description: 'Monthly generation mix across major fuel technologies.',
		dataSource: 'Open Electricity',
		notes: 'Values in GWh. Rooftop solar is estimated.',
		csvData: `Date,Coal,Gas,Wind,Solar,Hydro
2024-01-01,8200,3100,2800,3500,1200
2024-02-01,7800,2900,2600,3200,1100
2024-03-01,7500,2700,3100,2900,1300
2024-04-01,7200,2500,3400,2200,1400
2024-05-01,7800,2800,3600,1800,1500
2024-06-01,8100,3200,3800,1500,1600
2024-07-01,8500,3500,3500,1600,1400
2024-08-01,8300,3300,3200,2000,1300
2024-09-01,7900,2900,3000,2600,1200
2024-10-01,7400,2600,3300,3100,1100
2024-11-01,7100,2400,2900,3400,1000
2024-12-01,7600,2800,2700,3600,1100`
	},
	{
		name: 'Renewable vs fossil (area)',
		chartType: 'area',
		title: 'Renewable vs fossil fuel generation',
		description: 'Comparing total renewable and fossil fuel electricity output.',
		dataSource: 'Open Electricity',
		notes: 'Renewables include wind, solar, and hydro.',
		csvData: `Date,Renewables,Fossil Fuels
2020-01-01,5500,12800
2020-04-01,5800,11900
2020-07-01,6100,12200
2020-10-01,6400,11500
2021-01-01,6800,11800
2021-04-01,7200,11200
2021-07-01,7500,11500
2021-10-01,7900,10800
2022-01-01,8200,11100
2022-04-01,8600,10500
2022-07-01,8900,10800
2022-10-01,9300,10100
2023-01-01,9700,10400
2023-04-01,10100,9800
2023-07-01,10500,10100
2023-10-01,10900,9400
2024-01-01,11300,9700
2024-04-01,11700,9100
2024-07-01,12100,9400
2024-10-01,12500,8700`
	},
	{
		name: 'Wholesale electricity prices (line)',
		chartType: 'line',
		title: 'Wholesale electricity prices by state',
		description: 'Quarterly average spot prices across NEM regions.',
		dataSource: 'AEMO',
		notes: 'Prices in $/MWh. Negative values indicate oversupply periods.',
		csvData: `Date,NSW,VIC,QLD,SA
2022-01-01,85,78,92,105
2022-04-01,210,185,245,320
2022-07-01,155,140,180,195
2022-10-01,95,88,110,125
2023-01-01,78,72,85,98
2023-04-01,65,58,72,82
2023-07-01,88,80,95,110
2023-10-01,72,65,78,90
2024-01-01,68,62,75,85
2024-04-01,55,48,62,72
2024-07-01,75,68,82,95
2024-10-01,62,55,70,80`
	}
];
