/**
 * Build URL from navigation params
 * @param {{
 *   view: string,
 *   statuses: string[],
 *   regions: string[],
 *   fuelTechs: string[],
 *   sizes: string[],
 *   facility?: string | null
 * }} params
 * @returns {string}
 */
export function buildUrl(params) {
	let url = `/facilities/all?view=${params.view}&statuses=${params.statuses.join(',')}&regions=${params.regions.join(',')}&fuel_techs=${params.fuelTechs.join(',')}&sizes=${params.sizes.join(',')}`;
	if (params.facility) {
		url += `&facility=${params.facility}`;
	}
	return url;
}
