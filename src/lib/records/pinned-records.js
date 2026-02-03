import { parseISO } from 'date-fns';

/**
 * Pinned records configuration - defines which records to fetch for notable records display
 * @type {{ fuelTech: string, label: string, ids: string[] }[]}
 */
export const PINNED_CONFIG = [
	{
		fuelTech: 'solar',
		label: 'Solar',
		ids: [
			'power.interval.high',
			'energy.day.high',
			'energy.month.high',
			'energy.quarter.high',
			'energy.year.high'
		]
	},
	{
		fuelTech: 'wind',
		label: 'Wind',
		ids: [
			'power.interval.high',
			'energy.day.high',
			'energy.month.high',
			'energy.quarter.high',
			'energy.year.high'
		]
	},
	{
		fuelTech: 'battery_discharging',
		label: 'Battery',
		ids: [
			'power.interval.high',
			'energy.day.high',
			'energy.month.high',
			'energy.quarter.high',
			'energy.year.high'
		]
	},
	{
		fuelTech: 'renewables',
		label: 'Renewables',
		ids: [
			'power.interval.high',
			'energy.day.high',
			'energy.month.high',
			'energy.quarter.high',
			'energy.year.high'
		]
	},
	{
		fuelTech: 'coal',
		label: 'Coal',
		ids: ['power.interval.low']
	}
];

/**
 * Available regions for pinned records
 */
export const PINNED_REGIONS = [
	{ longValue: 'au.nem', value: 'nem', label: 'NEM', longLabel: 'National Electricity Market' },
	{ longValue: 'au.nem.nsw1', value: 'nsw1', label: 'NSW', longLabel: 'New South Wales' },
	{ longValue: 'au.nem.qld1', value: 'qld1', label: 'QLD', longLabel: 'Queensland' },
	{ longValue: 'au.nem.sa1', value: 'sa1', label: 'SA', longLabel: 'South Australia' },
	{ longValue: 'au.nem.tas1', value: 'tas1', label: 'TAS', longLabel: 'Tasmania' },
	{ longValue: 'au.nem.vic1', value: 'vic1', label: 'VIC', longLabel: 'Victoria' },
	{ longValue: 'au.wem', value: 'wem', label: 'WA', longLabel: 'Western Australia' }
];

/**
 * Empty record map template
 * @returns {Record<string, any>}
 */
export function createEmptyRecordMap() {
	return {
		solar: null,
		wind: null,
		battery_discharging: null,
		renewables: null,
		coal: null
	};
}

/**
 * Fetch pinned records for all regions (server-side)
 * @param {typeof fetch} fetchFn - The fetch function
 * @param {string} recordsApiUrl - The records API base URL
 * @param {string} apiKey - The API key for authorization
 * @returns {Promise<Record<string, any>>}
 */
export async function fetchPinnedRecords(fetchFn, recordsApiUrl, apiKey) {
	/** @type {{ recordId: string, fuelTech: string }[]} */
	const recordsToFetch = [];

	for (const region of PINNED_REGIONS) {
		for (const { fuelTech, ids } of PINNED_CONFIG) {
			for (const id of ids) {
				const recordId = `${region.longValue}.${fuelTech}.${id}`;
				recordsToFetch.push({ recordId, fuelTech });
			}
		}
	}

	// Fetch all records in parallel
	const results = await Promise.all(
		recordsToFetch.map(async ({ recordId, fuelTech }) => {
			try {
				const path = `${recordsApiUrl}/history/${recordId}?limit=1`;
				const response = await fetchFn(path, {
					headers: { Authorization: `Bearer ${apiKey}` }
				});
				if (response.ok) {
					const json = await response.json();
					return { fuelTech, data: json.data?.[0] || null };
				}
				return { fuelTech, data: null };
			} catch {
				return { fuelTech, data: null };
			}
		})
	);

	// Process results - keep most recent record per fuel tech
	const recordMap = createEmptyRecordMap();

	for (const { fuelTech, data } of results) {
		if (data) {
			const date = parseISO(data.interval);
			const time = date.getTime();

			if (recordMap[fuelTech] === null || time > recordMap[fuelTech].time) {
				recordMap[fuelTech] = {
					recordId: data.record_id,
					aggregate: data.aggregate,
					value: data.value,
					unit: data.value_unit,
					interval: data.interval,
					period: data.period,
					description: data.description,
					metric: data.metric,
					date: data.interval,
					time,
					networkRegion: data.network_region,
					networkId: data.network_id
				};
			}
		}
	}

	return recordMap;
}
