import optionsReducer from '$lib/utils/options-reducer';

export const regionOptions = [
	{
		value: 'NEM',
		label: 'NEM',
		shortLabel: 'NEM',
		description: 'National Electricity Market',
		colour: '#e34a33',
		dataPath: 'au/NEM'
	},
	{
		value: 'NSW1',
		label: 'New South Wales',
		shortLabel: 'NSW',
		description: 'New South Wales',
		colour: '#A078D7', // 49A4E8
		dataPath: 'au/NEM/NSW1'
	},
	{
		value: 'QLD1',
		label: 'Queensland',
		shortLabel: 'QLD',
		description: 'Queensland',
		colour: '#F480EE', // DC3A33
		dataPath: 'au/NEM/QLD1'
	},
	{
		value: 'SA1',
		label: 'South Australia',
		shortLabel: 'SA',
		description: 'South Australia',
		colour: '#069FAF', // f7c41d
		dataPath: 'au/NEM/SA1'
	},
	{
		value: 'TAS1',
		label: 'Tasmania',
		shortLabel: 'TAS',
		description: 'Tasmania',
		colour: '#E78114', // 65C7AA
		dataPath: 'au/NEM/TAS1'
	},
	{
		value: 'VIC1',
		label: 'Victoria',
		shortLabel: 'VIC',
		description: 'Victoria',
		colour: '#4F5FD7', // 153BA5
		dataPath: 'au/NEM/VIC1'
	},
	{
		value: 'WEM',
		label: 'Western Australia',
		shortLabel: 'WA',
		description: 'Western Australia',
		colour: '#BDBCBC',
		dataPath: 'au/WEM'
	}
];

export const regionsNemOnlyOptions = regionOptions.filter((d) => d.value !== 'WEM');
export const regionsOnly = regionOptions.map((d) => d.value).slice(1);
export const regionsWithShortLabels = optionsReducer(regionOptions, 'value', 'shortLabel');
export const regionsWithLabels = optionsReducer(regionOptions, 'value', 'label');
export const regionsWithColours = optionsReducer(regionOptions, 'value', 'colour');
export const regionsWithDataPaths = optionsReducer(regionOptions, 'value', 'dataPath');
