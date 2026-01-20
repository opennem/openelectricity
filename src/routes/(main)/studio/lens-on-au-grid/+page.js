/**
 * Lens on AU Grid - Page Load
 *
 * Fetches power generation data for all Australian electricity regions.
 * Data is loaded in parallel for optimal performance.
 */

/**
 * @typedef {'7d' | '30d' | '1y'} RangeType
 */

/**
 * @typedef {'5m' | '30m' | '1h'} IntervalType
 */

/**
 * @typedef {Object} RegionConfig
 * @property {string} path - API path for the region
 * @property {string} label - Display label for the region
 */

/**
 * @typedef {Object} RegionDataset
 * @property {Array<{type: string, fuel_tech?: string, id: string, history: {data: number[], start: string, interval: string}}>} data
 */

/**
 * @typedef {Object} RegionData
 * @property {string} region - Region code (e.g., 'NEM', 'NSW1')
 * @property {string} label - Display label
 * @property {string} path - API path
 * @property {RegionDataset | null} dataset - Fetched data or null on error
 * @property {boolean} [error] - True if fetch failed
 */

/**
 * @typedef {Object} PageData
 * @property {RegionData[]} regions - Data for all regions
 * @property {RangeType} range - Selected time range
 * @property {IntervalType} interval - Data interval
 */

/** @type {Record<string, RegionConfig>} */
const REGIONS = {
	NEM: { path: 'au/NEM', label: 'National Electricity Market' },
	NSW1: { path: 'au/NEM/NSW1', label: 'New South Wales' },
	QLD1: { path: 'au/NEM/QLD1', label: 'Queensland' },
	SA1: { path: 'au/NEM/SA1', label: 'South Australia' },
	TAS1: { path: 'au/NEM/TAS1', label: 'Tasmania' },
	VIC1: { path: 'au/NEM/VIC1', label: 'Victoria' },
	WEM: { path: 'au/WEM', label: 'Western Australia' }
};

/** @type {string[]} */
const REGION_ORDER = ['NEM', 'NSW1', 'QLD1', 'SA1', 'TAS1', 'VIC1', 'WEM'];

/**
 * Load page data
 * @param {Object} params
 * @param {URL} params.url
 * @param {typeof fetch} params.fetch
 * @returns {Promise<PageData>}
 */
export async function load({ url, fetch }) {
	const { searchParams } = url;
	const range = /** @type {RangeType} */ (searchParams.get('range') || '7d');
	const interval = /** @type {IntervalType} */ (searchParams.get('interval') || '5m');

	// Fetch data for all regions in parallel
	const regionDataPromises = REGION_ORDER.map(async (regionCode) => {
		const config = REGIONS[regionCode];

		try {
			const res = await fetch(`/api/tracker/${range}?regionPath=${config.path}`);

			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`);
			}

			const dataset = /** @type {RegionDataset} */ (await res.json());

			return /** @type {RegionData} */ ({
				region: regionCode,
				label: config.label,
				path: config.path,
				dataset
			});
		} catch (error) {
			console.error(`Failed to fetch data for ${regionCode}:`, error);

			return /** @type {RegionData} */ ({
				region: regionCode,
				label: config.label,
				path: config.path,
				dataset: null,
				error: true
			});
		}
	});

	const regions = await Promise.all(regionDataPromises);

	return {
		regions,
		range,
		interval
	};
}
