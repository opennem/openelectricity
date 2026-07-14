/**
 * Facility-flavoured ChartDataManager factory.
 *
 * ChartDataManager itself is neutral (cacheKey/seriesKey/networkTimezone plus
 * required processResponse/buildFetchUrl); this factory owns the facility
 * wiring — unit series ids for ordering/inversion, the unit-set identity key,
 * the network timezone lookup, the processFacilityPower processor and the
 * default facility URL (including the `network_id` param the facility API
 * route reads). Captures plain values only — manager continuations can
 * outlive the creating component.
 */

import ChartDataManager from '$lib/components/charts/v2/ChartDataManager.svelte.js';
import { processFacilityPower } from './process-facility-power.js';
import { getNetworkTimezone } from './helpers.js';
import { unitSeriesIds, unitsKeyFor } from './unit-analysis.js';

/**
 * @typedef {Object} FacilityDataManagerConfig
 * @property {string} facilityCode
 * @property {string} networkId - 'NEM' | 'WEM'
 * @property {string} [interval] - Data interval (default: '5m')
 * @property {string} [metric] - Data metric (default: 'power'); series ids carry
 *   this prefix (power_/energy_…), so ordering/inversion are built per metric
 * @property {Record<string, string>} unitFuelTechMap - unit code → fuel tech
 * @property {string[]} [orderedCodes] - Unit codes in stack order
 * @property {string[]} [loadCodes] - Unit codes whose series are inverted (loads)
 * @property {(unitCode: string, fuelTech: string) => string} getLabel
 * @property {(unitCode: string, fuelTech: string) => string} getColour
 * @property {((params: URLSearchParams) => string) | null} [buildFetchUrl] -
 *   Override the facility URL (e.g. the combined-metrics URL); `network_id` is
 *   injected into the params either way
 */

/**
 * @param {FacilityDataManagerConfig} config
 * @returns {ChartDataManager}
 */
export function createFacilityDataManager(config) {
	const {
		facilityCode,
		networkId,
		interval = '5m',
		metric = 'power',
		unitFuelTechMap,
		orderedCodes = [],
		loadCodes = [],
		getLabel,
		getColour,
		buildFetchUrl = null
	} = config;

	const networkTimezone = getNetworkTimezone(networkId);
	const unitOrder = unitSeriesIds(metric, orderedCodes);
	const loadsToInvert = unitSeriesIds(metric, loadCodes);

	return new ChartDataManager({
		cacheKey: facilityCode,
		seriesKey: unitsKeyFor(unitFuelTechMap ?? {}),
		networkTimezone,
		interval,
		metric,
		processResponse: (response) =>
			processFacilityPower(response, {
				unitFuelTechMap,
				unitOrder,
				loadsToInvert,
				getLabel,
				getColour,
				metricFilter: metric,
				networkTimezone
			}),
		buildFetchUrl: (params) => {
			params.set('network_id', networkId);
			return buildFetchUrl
				? buildFetchUrl(params)
				: `/api/facilities/${facilityCode}/power?${params.toString()}`;
		}
	});
}
