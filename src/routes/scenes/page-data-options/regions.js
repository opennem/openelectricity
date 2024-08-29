export const regionOptions = [
	{
		value: '_all',
		label: 'NEM Regions',
		shortLabel: 'NEM',
		description: 'National Electricity Market',
		colour: '#e34a33'
	},
	{
		value: 'nsw1',
		label: 'New South Wales',
		shortLabel: 'NSW',
		description: 'New South Wales',
		colour: '#A078D7' // 49A4E8
	},
	{
		value: 'qld1',
		label: 'Queensland',
		shortLabel: 'QLD',
		description: 'Queensland',
		colour: '#F480EE' // DC3A33
	},
	{
		value: 'sa1',
		label: 'South Australia',
		shortLabel: 'SA',
		description: 'South Australia',
		colour: '#069FAF' // f7c41d
	},
	{
		value: 'tas1',
		label: 'Tasmania',
		shortLabel: 'TAS',
		description: 'Tasmania',
		colour: '#E78114' // 65C7AA
	},
	{
		value: 'vic1',
		label: 'Victoria',
		shortLabel: 'VIC',
		description: 'Victoria',
		colour: '#4F5FD7' // 153BA5
	}
];
/**
 * @type {Object.<string, Object<string, string | string[]>>}
 */
export const regionsWithShortLabels = regionOptions.reduce(
	(acc, curr) => ((acc[curr.value] = curr.shortLabel), acc),
	{}
);
export const regionsOnly = regionOptions.map((d) => d.value).slice(1);
export const regionsOnlyWithColours = regionOptions.reduce(
	(acc, curr) => ((acc[curr.value] = curr.colour), acc),
	{}
);
export const regionsOnlyWithLabels = regionOptions.reduce(
	(acc, curr) => ((acc[curr.value] = curr.label), acc),
	{}
);
