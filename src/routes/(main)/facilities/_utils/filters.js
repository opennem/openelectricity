import optionsReducer from '$lib/utils/options-reducer';

export const sizeOptions = [
	{
		label: '< 1MW',
		value: 'xs',
		min: 0,
		max: 1
	},
	{
		label: '1 – 5MW',
		value: 'sm',
		min: 1,
		max: 5
	},
	{
		label: '5 – 30MW',
		value: 'md',
		min: 5,
		max: 30
	},
	{
		label: '> 30MW',
		value: 'lg',
		min: 30,
		max: Infinity
	}
];

/**
 * Get size ranges from selected size values
 * @param {string[]} selectedSizes
 * @returns {{min: number, max: number}[]}
 */
export function getSizeRanges(selectedSizes) {
	return sizeOptions.filter((opt) => selectedSizes.includes(opt.value));
}

/**
 * Check if a capacity falls within any of the selected size ranges
 * @param {number} capacity
 * @param {string[]} selectedSizes
 * @returns {boolean}
 */
export function isInSizeRange(capacity, selectedSizes) {
	if (selectedSizes.length === 0) return true;
	const ranges = getSizeRanges(selectedSizes);
	return ranges.some((range) => capacity >= range.min && capacity < range.max);
}

/** @type {Record<string, string>} */
export const statusColours = {
	committed: '#e0dfdc',
	commissioning: '#ffb108',
	operating: '#75e74d',
	retired: '#6a6a6a'
};

export const statusOptions = [
	{
		label: 'Committed',
		value: 'committed',
		colour: statusColours.committed
	},
	{
		label: 'Commissioning',
		value: 'commissioning',
		colour: statusColours.commissioning
	},
	{
		label: 'Operating',
		value: 'operating',
		colour: statusColours.operating
	},
	{
		label: 'Retired',
		value: 'retired',
		colour: statusColours.retired
	}
];

export const regions = [
	// { longValue: 'au.nem', value: 'nem', label: 'NEM', longLabel: 'National Electricity Market' },
	// { value: undefined, label: '', divider: true },
	{ longValue: 'au.nem.nsw1', value: 'nsw1', label: 'NSW', longLabel: 'New South Wales' },
	{ longValue: 'au.nem.qld1', value: 'qld1', label: 'QLD', longLabel: 'Queensland' },
	{ longValue: 'au.nem.sa1', value: 'sa1', label: 'SA', longLabel: 'South Australia' },
	{ longValue: 'au.nem.tas1', value: 'tas1', label: 'TAS', longLabel: 'Tasmania' },
	{ longValue: 'au.nem.vic1', value: 'vic1', label: 'VIC', longLabel: 'Victoria' },
	{ value: undefined, label: '', divider: true },
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

export const fuelTechOptions = [
	// {
	// 	value: null,
	// 	label: 'All'
	// },
	// {
	// 	value: 'demand',
	// 	label: 'Demand'
	// },
	// {
	// 	value: 'renewables',
	// 	label: 'Renewables'
	// },
	// {
	// 	value: 'fossils',
	// 	label: 'Fossils'
	// },
	// {
	// 	value: undefined,
	// 	label: '',
	// 	divider: true
	// },
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
		value: 'battery',
		label: 'Battery'
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
