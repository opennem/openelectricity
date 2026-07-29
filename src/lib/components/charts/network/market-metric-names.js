/**
 * Public metric → OE market metrics fetched/read for it. Single source of
 * truth shared by the /api/network/data route (what to fetch) and
 * market-metrics.js (what to read). Keep dependency-free — the server route
 * imports it.
 *
 * @type {Record<string, import('openelectricity').MarketMetric[]>}
 */
export const MARKET_METRIC_NAMES = {
	price: ['price'],
	demand: ['demand'],
	demand_energy: ['demand_energy'],
	curtailment: ['curtailment_solar_utility', 'curtailment_wind'],
	curtailment_energy: ['curtailment_solar_utility_energy', 'curtailment_wind_energy'],
	// Single-fuel-tech curtailment — the facility page shows only the split
	// matching the facility's own fuel tech (a wind farm's page has nothing to
	// say about solar curtailment). Facilities with both fall back to the
	// combined `curtailment` key above.
	curtailment_wind: ['curtailment_wind'],
	curtailment_wind_energy: ['curtailment_wind_energy'],
	curtailment_solar: ['curtailment_solar_utility'],
	curtailment_solar_energy: ['curtailment_solar_utility_energy'],
	flows: ['flow_imports', 'flow_exports'],
	flows_energy: ['flow_imports_energy', 'flow_exports_energy']
};
