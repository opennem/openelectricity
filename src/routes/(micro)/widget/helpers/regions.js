import optionsReducer from '$lib/utils/options-reducer';

const regionOptions = [
	{
		value: 'NEM',
		label: 'NEM',
		dataPath: 'au/NEM'
	},
	{
		value: 'NSW1',
		label: 'New South Wales',
		dataPath: 'au/NEM/NSW1'
	},
	{
		value: 'QLD1',
		label: 'Queensland',
		dataPath: 'au/NEM/QLD1'
	},
	{
		value: 'SA1',
		label: 'South Australia',
		dataPath: 'au/NEM/SA1'
	},
	{
		value: 'TAS1',
		label: 'Tasmania',
		dataPath: 'au/NEM/TAS1'
	},
	{
		value: 'VIC1',
		label: 'Victoria',
		dataPath: 'au/NEM/VIC1'
	},
	{
		value: 'WEM',
		label: 'Western Australia',
		dataPath: 'au/WEM'
	}
];

export const regionsWithLabels = optionsReducer(regionOptions, 'value', 'label');
export const regionsWithDataPaths = optionsReducer(regionOptions, 'value', 'dataPath');
