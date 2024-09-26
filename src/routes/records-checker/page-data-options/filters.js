const regionOptions = [
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
			},
			{
				value: 'wem',
				label: 'Wholesale Electricity Market (WEM)'
			}
		]
	}
];

const aggregateOptions = [
	{
		value: 'low',
		label: 'Low'
	},
	{
		value: 'high',
		label: 'High'
	}
];

const periodOptions = [
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

const fuelTechOptions = [
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
		label: 'Battery (Charging)'
	},
	{
		value: 'battery_discharging',
		label: 'Battery (Discharging)'
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

const metricOptions = [
	{
		value: 'power',
		label: 'Power'
	},
	{
		value: 'energy',
		label: 'Energy'
	},
	{
		value: 'price',
		label: 'Price'
	},
	{
		value: 'market_value',
		label: 'Market Value'
	},
	{
		value: 'emissions',
		label: 'Emissions'
	},
	{
		value: 'proportion',
		label: 'Proportion'
	}
];

export { regionOptions, aggregateOptions, periodOptions, fuelTechOptions, metricOptions };
