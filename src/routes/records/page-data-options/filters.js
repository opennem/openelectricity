import optionsReducer from '$lib/utils/options-reducer';

export const regionOptions = [
	{
		value: '_all',
		label: 'All Regions',
		children: [
			{
				value: 'nem',
				label: 'National Electricity Market (NEM)',
				children: [
					{
						value: 'nsw1',
						label: 'New South Wales'
					},
					{
						value: 'qld1',
						label: 'Queensland'
					},
					{
						value: 'sa1',
						label: 'South Australia'
					},
					{
						value: 'tas1',
						label: 'Tasmania'
					},
					{
						value: 'vic1',
						label: 'Victoria'
					}
				]
			}
			// {
			// 	value: 'WEMDE',
			// 	label: 'WEM Dispatch Engine',
			// 	children: [
			// 		{
			// 			value: 'WEM',
			// 			label: 'Western Australia (SWIS)'
			// 		}
			// 	]
			// }
		]
	}
];

export const aggregateOptions = [
	{
		value: 'low',
		label: 'Low'
	},
	{
		value: 'high',
		label: 'High'
	}
];

export const periodOptions = [
	{
		value: 'interval',
		label: 'Interval'
	},
	{
		value: 'day',
		label: 'Day'
	},
	{
		value: '7d',
		label: '7D'
	},
	{
		value: 'month',
		label: 'Month'
	},
	{
		value: 'quarter',
		label: 'Quarter'
	},
	{
		value: 'season',
		label: 'Season'
	},
	{
		value: 'year',
		label: 'Year'
	},
	{
		value: 'financial_year',
		label: 'Financial Year'
	}
];
export const periodLabel = optionsReducer(periodOptions);

export const fuelTechOptions = [
	{
		value: 'solar',
		label: 'Solar'
	},
	{
		value: 'wind',
		label: 'Wind'
	},
	{
		value: 'hydro',
		label: 'Hydro'
	},
	{
		value: 'pumps',
		label: 'Pumps'
	},
	{
		value: 'battery_charging',
		label: 'Battery charge'
	},
	{
		value: 'battery_discharging',
		label: 'Battery discharge'
	},
	{
		value: 'bioenergy',
		label: 'Bioenergy'
	},
	{
		value: 'coal',
		label: 'Coal'
	},
	{
		value: 'distillate',
		label: 'Distillate'
	},
	{
		value: 'gas',
		label: 'Gas'
	},
	{
		value: 'demand',
		label: 'Demand'
	},
	{
		value: 'renewables',
		label: 'Renewables'
	},
	{
		value: 'fossils',
		label: 'Fossils'
	}
];
export const fuelTechLabel = optionsReducer(fuelTechOptions);

export const milestoneTypeOptions = [
	{
		value: 'power',
		label: 'Power',
		displayPrefix: 'M',
		allowedPrefixes: ['M', 'G']
	},
	{
		value: 'energy',
		label: 'Energy',
		displayPrefix: 'M',
		allowedPrefixes: ['M', 'G']
	},
	{
		value: 'price',
		label: 'Price',
		displayPrefix: '',
		allowedPrefixes: []
	},
	{
		value: 'market_value',
		label: 'Market Value',
		displayPrefix: '',
		allowedPrefixes: []
	},
	{
		value: 'emissions',
		label: 'Emissions',
		displayPrefix: '',
		allowedPrefixes: []
	},
	{
		value: 'proportion',
		label: 'Proportion',
		displayPrefix: '',
		allowedPrefixes: []
	}
];
export const milestoneTypeLabel = optionsReducer(milestoneTypeOptions);
export const milestoneTypeDisplayPrefix = optionsReducer(
	milestoneTypeOptions,
	'value',
	'displayPrefix'
);
export const milestoneTypeDisplayAllowedPrefixes = optionsReducer(
	milestoneTypeOptions,
	'value',
	'allowedPrefixes'
);
