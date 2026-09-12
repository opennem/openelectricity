import optionsReducer from '$lib/utils/options-reducer';

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
	},
	{
		value: 'wem',
		label: 'Western Australia',
		shortLabel: 'WA',
		description: 'Western Australia',
		colour: '#BDBCBC'
	}
];

/**
 * The combined NEM + WEM scope. Kept out of `regionOptions` — the positional
 * derivations below (`regionsOnly`, `regionsNemOnlyOptions`) and the scenarios
 * filters assume single-network scopes — but exported once so every tracker
 * surface describes it the same way.
 */
export const allRegionsOption = {
	value: 'au',
	label: 'All Regions',
	shortLabel: 'AU',
	description: 'NEM and WEM combined',
	colour: '#333333'
};

/** The Explorer regions with the combined scope first. */
export const regionOptionsWithAu = [allRegionsOption, ...regionOptions];

/**
 * Whether a scope has a spot price — every scope except the combined one,
 * which has no national spot price.
 * @param {string} region
 */
export function hasSpotPrice(region) {
	return region !== allRegionsOption.value;
}

/**
 * Display label for a region value, falling back to the value itself.
 * @param {string} value
 * @param {Array<{ value: string, label: string }>} [options]
 */
export function regionLabel(value, options = regionOptionsWithAu) {
	return options.find((option) => option.value === value)?.label ?? value;
}

export const regionsNemOnlyOptions = regionOptions.filter((d) => d.value !== 'wem');
export const regionsOnly = regionOptions.map((d) => d.value).slice(1);
export const regionsWithShortLabels = optionsReducer(regionOptions, 'value', 'shortLabel');
export const regionsWithLabels = optionsReducer(regionOptions, 'value', 'label');
export const regionsWithColours = optionsReducer(regionOptions, 'value', 'colour');
