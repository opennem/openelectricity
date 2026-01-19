import optionsReducer from '$lib/utils/options-reducer';

export const sizeOptions = [
	{
		label: '< 1 MW',
		value: 'xs',
		min: 0,
		max: 1
	},
	{
		label: '1 – 5 MW',
		value: 'sm',
		min: 1,
		max: 5
	},
	{
		label: '5 – 30 MW',
		value: 'md',
		min: 5,
		max: 30
	},
	{
		label: '> 30 MW',
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

/** @type {{value: string, label: string, colour: string, children?: {value: string, label: string, colour: string}[]}[]} */
export const fuelTechOptions = [
	{
		value: 'solar',
		label: 'Solar',
		colour: '#FED500'
	},
	{
		value: 'wind',
		label: 'Wind',
		colour: '#2C7629'
	},
	{
		value: 'hydro',
		label: 'Hydro',
		colour: '#5EA0C0'
	},
	{
		value: 'battery',
		label: 'Battery',
		colour: '#3245c9'
	},
	{
		value: 'gas',
		label: 'Gas',
		colour: '#E87809',
		children: [
			{ value: 'gas_recip', label: 'Gas (Reciprocating)', colour: '#F9DCBC' },
			{ value: 'gas_ocgt', label: 'Gas (OCGT)', colour: '#FFCD96' },
			{ value: 'gas_ccgt', label: 'Gas (CCGT)', colour: '#FDB462' },
			{ value: 'gas_steam', label: 'Gas (Steam)', colour: '#F48E1B' },
			{ value: 'gas_wcmg', label: 'Gas (Waste Coal Mine)', colour: '#B46813' }
		]
	},
	{
		value: 'distillate',
		label: 'Distillate',
		colour: '#E15C34'
	},
	{
		value: 'bioenergy',
		label: 'Bioenergy',
		colour: '#1D7A7A',
		children: [
			{ value: 'bioenergy_biomass', label: 'Bioenergy (Biomass)', colour: '#1D7A7A' },
			{ value: 'bioenergy_biogas', label: 'Bioenergy (Biogas)', colour: '#4CB9B9' }
		]
	},
	{
		value: 'coal',
		label: 'Coal',
		colour: '#25170C',
		children: [
			{ value: 'coal_black', label: 'Coal (Black)', colour: '#121212' },
			{ value: 'coal_brown', label: 'Coal (Brown)', colour: '#744A26' }
		]
	}
];

/**
 * Flatten the hierarchical fuel tech options to a simple list for label lookup
 * @returns {{value: string, label: string}[]}
 */
export function getFlatFuelTechOptions() {
	/** @type {{value: string, label: string}[]} */
	const flat = [];
	for (const opt of fuelTechOptions) {
		flat.push({ value: opt.value, label: opt.label });
		if (opt.children) {
			for (const child of opt.children) {
				flat.push({ value: child.value, label: child.label });
			}
		}
	}
	return flat;
}

/**
 * Get the values of parent fuel techs that have children (e.g., 'gas', 'coal', 'bioenergy')
 * These should not be counted when displaying the selection count
 * @returns {string[]}
 */
export function getParentFuelTechValues() {
	return fuelTechOptions
		.filter((opt) => opt.children && opt.children.length > 0)
		.map((opt) => opt.value);
}

export const fuelTechLabel = optionsReducer(getFlatFuelTechOptions());

/**
 * Get the display label for a region
 * @param {string} network_id
 * @param {string} network_region
 * @returns {string}
 */
export function getRegionLabel(network_id, network_region) {
	if (network_region) {
		return regions.find((r) => r.value === network_region.toLowerCase())?.label || network_region;
	}
	return network_id?.toUpperCase() || '';
}
