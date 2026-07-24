/**
 * Latest-value extractors for the legacy stats payloads served by
 * `/api/flows` (pairwise interconnector MW, keyed like 'NSW1->QLD1') and
 * `/api/prices` (regional spot prices). Shared by the homepage
 * system-snapshot map and the tracker-map prototypes.
 *
 * @typedef {{ code: string, history: { last: string, data: number[] } }} StatsSeries
 */

/**
 * Extract the latest flow value per interconnector from the parsed payload.
 * @param {StatsSeries[] | null | undefined} jsonData
 * @returns {{ dispatchDateTimeString: string, regionFlows: Record<string, number>, originalJsons: StatsSeries[] | null }}
 */
export function processFlowsJson(jsonData) {
	/** @type {Record<string, number>} */
	const regionFlows = {};

	if (jsonData) {
		jsonData.forEach((region) => {
			regionFlows[region.code] = region.history.data[region.history.data.length - 1];
		});

		return {
			dispatchDateTimeString: jsonData[0].history.last,
			regionFlows,
			originalJsons: jsonData
		};
	}

	return {
		dispatchDateTimeString: '',
		regionFlows,
		originalJsons: null
	};
}

/**
 * Extract the latest spot price per region from the parsed payload.
 * @param {StatsSeries[] | null | undefined} jsonData
 * @returns {{ regionPrices: Record<string, number>, originalJsons: StatsSeries[] | null }}
 */
export function processPricesJson(jsonData) {
	/** @type {Record<string, number>} */
	const regionPrices = {};

	if (jsonData) {
		jsonData.forEach((region) => {
			regionPrices[region.code] = region.history.data[region.history.data.length - 1];
		});

		return {
			regionPrices,
			originalJsons: jsonData
		};
	}

	return {
		regionPrices,
		originalJsons: null
	};
}

/**
 * Process a flows API response.
 * @param {Response} res
 */
export async function processFlows(res) {
	const { data } = await res.json();
	return processFlowsJson(data);
}

/**
 * Process a prices API response.
 * @param {Response} res
 */
export async function processPrices(res) {
	const { data } = await res.json();
	return processPricesJson(data);
}
