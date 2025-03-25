import optionsReducer from '$lib/utils/options-reducer';

export const dataTypeOptions = [
	{
		value: 'energy',
		label: 'Generation',
		longLabel: 'Energy Generation',
		units: 'TWh',
		intervalLabel: 'by Financial Year',
		description: 'Energy Generation (TWh) by Financial Year'
	},

	{
		value: 'emissions',
		label: 'Emissions',
		longLabel: 'Emissions',
		units: 'MtCO₂e',
		intervalLabel: 'by Financial Year',
		description: 'Emissions (MtCO₂e) by Financial Year'
	},

	{
		value: 'capacity',
		label: 'Capacity',
		longLabel: 'Generation Capacity',
		units: 'GW',
		intervalLabel: 'by Financial Year',
		description: 'Capacity (GW) by Financial Year'
	}
];

export const dataTypeDisplayOptions = [
	{ value: 'generation', label: 'Generation' },
	{ value: 'emissions', label: 'Emissions' },
	{ value: 'intensity', label: 'Intensity' },
	{ value: 'capacity', label: 'Capacity' }
];

export const dataTypeDescription = optionsReducer(dataTypeOptions, 'value', 'description');
export const dataTypelabel = optionsReducer(dataTypeOptions);
export const dataTypeUnits = optionsReducer(dataTypeOptions, 'value', 'units');
export const dataTypeLongLabel = optionsReducer(dataTypeOptions, 'value', 'longLabel');
export const dataTypeIntervalLabel = optionsReducer(dataTypeOptions, 'value', 'intervalLabel');
