/**
 * @typedef {Object} FuelTechGroup
 * @property {string} label - Display label for the group
 * @property {string[]} order - Array of fueltech group names in display order
 */

/**
 * @typedef {Object.<string, FuelTechGroup>} GenerationTrendsGroups
 * @property {FuelTechGroup} default - Default fueltech group configuration
 */

/**
 * @typedef {Object} GroupConfig
 * @property {string} name - Name of the selected group
 * @property {string} label - Label of the selected group
 * @property {Array<{value: string, label: string}>} availableGroups - List of available group options
 */

/**
 * @typedef {Object} QueryParams
 * @property {'market' | 'network'} dataType
 * @property {import('openelectricity').NetworkCode} networkId
 * @property {import('openelectricity').DataMetric | import('openelectricity').MarketMetric} metric
 * @property {import('openelectricity').DataInterval} interval
 * @property {string} dateStart
 * @property {string} dateEnd
 * @property {import('openelectricity').DataPrimaryGrouping} primaryGrouping
 * @property {import('openelectricity').DataSecondaryGrouping} secondaryGrouping
 * @property {string} networkRegion
 * @property {string} group
 */

// Local fueltech group configuration for this page
/** @type {GenerationTrendsGroups} */
const generationTrendsGroups = {
	default: {
		label: 'Default',
		order: [
			'wind',
			'solar',
			'coal',
			'hydro',
			'gas',
			'bioenergy',
			'distillate',
			'battery_discharging'
		]
	},
	wind_solar: {
		label: 'Wind & Solar',
		order: ['solar', 'wind']
	},
	coal: {
		label: 'Coal',
		order: ['coal']
	}
};

/**
 * Fetches data for a specific fueltech group
 * @param {Function} fetch - SvelteKit fetch function
 * @param {QueryParams} params - Query parameters object
 * @param {string} fueltechGroup - The fueltech group to fetch data for
 * @returns {Promise<Object>} The API response data
 */
async function fetchFueltechData(fetch, params, fueltechGroup) {
	const {
		dataType,
		networkId,
		metric,
		interval,
		dateStart,
		dateEnd,
		primaryGrouping,
		secondaryGrouping,
		networkRegion
	} = params;

	const searchParams = new URLSearchParams({
		dataType,
		networkId,
		metric,
		interval,
		dateStart,
		dateEnd,
		primaryGrouping,
		secondaryGrouping,
		fueltechGroup,
		networkRegion
	});

	const response = await fetch(`/api/openelectricity?${searchParams}`);
	const data = await response.json();
	return data.data[0];
}

export async function load({ params, url, fetch }) {
	let { searchParams } = url;

	/** @type {QueryParams} */
	const queryParams = {
		dataType: /** @type {'market' | 'network'} */ (searchParams.get('dataType')) || 'network',
		networkId:
			/** @type {import('openelectricity').NetworkCode} */ (searchParams.get('networkId')) || 'AU',
		metric:
			/** @type {import('openelectricity').DataMetric | import('openelectricity').MarketMetric} */ (
				searchParams.get('metric')
			) || 'energy',
		interval:
			/** @type {import('openelectricity').DataInterval} */ (searchParams.get('interval')) || '1M',
		dateStart: searchParams.get('dateStart') || '2015-01-01',
		dateEnd:
			searchParams.get('dateEnd') ||
			(() => {
				const today = new Date();
				const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
				return endOfLastMonth.toISOString().split('T')[0];
			})(),
		primaryGrouping:
			/** @type {import('openelectricity').DataPrimaryGrouping} */ (
				searchParams.get('primaryGrouping')
			) || 'network',
		secondaryGrouping:
			/** @type {import('openelectricity').DataSecondaryGrouping} */ (
				searchParams.get('secondaryGrouping')
			) || 'fueltech_group',
		networkRegion: searchParams.get('networkRegion') || '',
		group: searchParams.get('group') || 'default'
	};

	// Get the selected fueltech group configuration
	/** @type {FuelTechGroup} */
	const selectedGroup = generationTrendsGroups[queryParams.group] || generationTrendsGroups.default;

	// Get the fueltech groups from the selected configuration
	const fueltechGroups = selectedGroup.order;

	// Fetch data for all fueltech groups in parallel
	const fueltechDataArray = await Promise.all(
		fueltechGroups.map((group) => fetchFueltechData(fetch, queryParams, group))
	);

	// Create a dynamic result object based on the selected groups
	/** @type {Object.<string, any>} */
	const fueltechData = {};
	fueltechGroups.forEach((group, index) => {
		fueltechData[group] = fueltechDataArray[index];
	});

	return {
		label: selectedGroup.label,
		order: selectedGroup.order,
		data: fueltechData,
		queryParams
	};
}
