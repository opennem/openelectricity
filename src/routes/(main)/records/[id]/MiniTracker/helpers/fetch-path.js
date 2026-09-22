import { apiIntervalMap } from './config.js';

/**
 * Build the time-series request for a record's surrounding chart.
 * Renewable proportion is already a market percentage, not a fuel-tech series.
 * @param {MilestoneRecord} record
 * @param {string} dateStart
 * @param {string} dateEnd
 */
export function getFetchPath(record, dateStart, dateEnd) {
	const isRenewableProportion = record.metric === 'renewable_proportion';
	const fuelTechId = record.fueltech_id;
	const isDemand = fuelTechId === 'demand';
	const isMarket = isDemand || isRenewableProportion;
	const isFossilsOrRenewables = fuelTechId === 'fossils' || fuelTechId === 'renewables';
	const metric = isDemand
		? record.period === 'interval'
			? 'demand'
			: 'demand_energy'
		: record.metric;
	const query = new URLSearchParams({
		dataType: isMarket ? 'market' : 'network',
		networkId: record.network_id,
		metric,
		interval: apiIntervalMap[record.period],
		dateStart,
		dateEnd,
		primaryGrouping: record.network_region ? 'network_region' : 'network'
	});

	if (fuelTechId && !isMarket) {
		query.set('secondaryGrouping', isFossilsOrRenewables ? 'renewable' : 'fueltech_group');
		if (!isFossilsOrRenewables) query.set('fueltechGroup', fuelTechId);
	}
	if (record.network_region) query.set('networkRegion', record.network_region);

	return `/api/openelectricity?${query}`;
}
