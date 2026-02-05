import optionsReducer from '$lib/utils/options-reducer';

export const regions = [
	{ longValue: 'au.nem', value: 'nem', label: 'NEM', longLabel: 'National Electricity Market' },
	{ value: '_divider_1', label: '', divider: true },
	{ longValue: 'au.nem.nsw1', value: 'nsw1', label: 'NSW', longLabel: 'New South Wales' },
	{ longValue: 'au.nem.qld1', value: 'qld1', label: 'QLD', longLabel: 'Queensland' },
	{ longValue: 'au.nem.sa1', value: 'sa1', label: 'SA', longLabel: 'South Australia' },
	{ longValue: 'au.nem.tas1', value: 'tas1', label: 'TAS', longLabel: 'Tasmania' },
	{ longValue: 'au.nem.vic1', value: 'vic1', label: 'VIC', longLabel: 'Victoria' },
	{ value: '_divider_2', label: '', divider: true },
	{ longValue: 'au.wem', value: 'wem', label: 'WA', longLabel: 'Western Australia' }
];

export const networkRegionsOnly = ['nsw1', 'qld1', 'sa1', 'tas1', 'vic1'];

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
		label: 'Lowest'
	},
	{
		value: 'high',
		label: 'Highest'
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
	// {
	// 	value: '7d',
	// 	label: '7D'
	// },
	{
		value: 'month',
		label: 'Month'
	},
	{
		value: 'quarter',
		label: 'Quarter'
	},
	// {
	// 	value: 'season',
	// 	label: 'Season'
	// },
	{
		value: 'year',
		label: 'Year'
	}
	// {
	// 	value: 'financial_year',
	// 	label: 'Financial Year'
	// }
];
export const periodLabel = optionsReducer(periodOptions);

export const fuelTechOptions = [
	{
		value: null,
		label: 'All'
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
	},
	{
		value: '_divider_ft',
		label: '',
		divider: true
	},
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
		value: 'coal',
		label: 'Coal'
	},
	{
		value: 'gas',
		label: 'Gas'
	},
	{
		value: 'bioenergy',
		label: 'Bioenergy'
	},
	{
		value: 'distillate',
		label: 'Distillate'
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
	// {
	// 	value: 'price',
	// 	label: 'Price',
	// 	displayPrefix: '',
	// 	allowedPrefixes: []
	// },
	// {
	// 	value: 'market_value',
	// 	label: 'Market Value',
	// 	displayPrefix: '',
	// 	allowedPrefixes: []
	// },
	{
		value: 'emissions',
		label: 'Emissions',
		displayPrefix: '',
		allowedPrefixes: ['', 'k']
	},
	{
		value: 'renewable_proportion',
		label: 'Renewable Proportion',
		displayPrefix: '',
		allowedPrefixes: ['']
	}
	// {
	// 	value: 'proportion',
	// 	label: 'Proportion',
	// 	displayPrefix: '',
	// 	allowedPrefixes: []
	// }
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

/**
 *
 * @param {*} param0
 * @returns
 */
export function getFilterParams({
	regions,
	periods,
	fuelTechs,
	stringFilter,
	aggregates,
	metrics,
	significance
}) {
	const validRegions = regions.filter((/** @type {string} */ r) => r !== '_all');

	// 8 as in ['_all', 'nem', 'nsw1', 'qld1', 'sa1', 'tas1', 'vic1', 'wem']
	const regionsParam =
		regions.length === 0 || regions.length === 8 ? '' : '&regions=' + validRegions.join(',');

	const periodsParam =
		periods.length === periodOptions.length || periods.length === 0
			? ''
			: '&periods=' + periods.join(',');

	const aggregatesParam =
		aggregates.length === aggregateOptions.length ? '' : '&aggregates=' + aggregates.join(',');

	const metricsParam =
		metrics.length === milestoneTypeOptions.length || metrics.length === 0
			? ''
			: '&metrics=' + metrics.join(',');

	const fuelTechParams =
		fuelTechs.length === fuelTechOptions.length || fuelTechs.length === 0
			? ''
			: '&fuel_techs=' + fuelTechs.join(',');

	const recordIdSearchParam = stringFilter
		? `&recordIdFilter=${encodeURIComponent(stringFilter.trim())}`
		: '';

	const significanceParam = significance ? `&significance=${significance}` : '';

	return {
		regionsParam,
		periodsParam,
		recordIdSearchParam,
		fuelTechParams,
		aggregatesParam,
		metricsParam,
		significanceParam
	};
}
