/**
 * Latest-value extractors for the legacy stats payloads served by
 * `/api/flows` (pairwise interconnector MW, keyed like 'NSW1->QLD1') and
 * `/api/prices` (regional spot prices). Shared by the homepage
 * system-snapshot map and the tracker's grid-live store — both read only the
 * latest sample, so the full histories are deliberately not passed through.
 *
 * @typedef {{ code: string, history: { last: string, data: number[] } }} StatsSeries
 */

/**
 * Latest value per series code.
 * @param {StatsSeries[] | null | undefined} jsonData
 * @returns {Record<string, number>}
 */
function latestByCode(jsonData) {
	/** @type {Record<string, number>} */
	const latest = {};
	for (const series of jsonData ?? []) {
		latest[series.code] = series.history.data[series.history.data.length - 1];
	}
	return latest;
}

/**
 * Extract the latest flow value per interconnector from the parsed payload.
 * @param {StatsSeries[] | null | undefined} jsonData
 * @returns {{ dispatchDateTimeString: string, regionFlows: Record<string, number> }}
 */
export function processFlowsJson(jsonData) {
	return {
		dispatchDateTimeString: jsonData?.[0]?.history.last ?? '',
		regionFlows: latestByCode(jsonData)
	};
}

/**
 * Extract the latest spot price per region from the parsed payload.
 * @param {StatsSeries[] | null | undefined} jsonData
 * @returns {{ regionPrices: Record<string, number> }}
 */
export function processPricesJson(jsonData) {
	return { regionPrices: latestByCode(jsonData) };
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
