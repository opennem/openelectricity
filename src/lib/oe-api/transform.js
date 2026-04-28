/**
 * Unit conversions to match legacy data format expected by the processing pipeline.
 * OE API returns MWh for energy (legacy: GWh) and t for emissions (legacy: tCO2e).
 * @type {Record<string, { divisor: number, unit: string }>}
 */
const unitConversions = {
	MWh: { divisor: 1000, unit: 'GWh' },
	t: { divisor: 1, unit: 'tCO2e' }
};

/**
 * Market metrics whose response payload is actually in GWh even though the OE
 * API metadata reports `unit: "MWh"`. Verified by inspecting the raw API
 * response — values for these metrics are ~1000× smaller than the data-endpoint
 * fueltech energy values they should match in scale. Skipping the MWh→GWh
 * divisor for these prevents double-conversion.
 *
 * @type {Set<string>}
 */
const METRICS_RETURNED_AS_GWH = new Set([
	'demand_gross_energy',
	'demand_energy',
	'generation_renewable_energy',
	'generation_renewable_with_storage_energy',
	'curtailment_energy',
	'curtailment_solar_utility_energy',
	'curtailment_wind_energy',
	'flow_imports_energy',
	'flow_exports_energy'
]);

/**
 * Transform OE API INetworkTimeSeries response into StatsData[] format
 * that the processing pipeline expects.
 *
 * @param {import('openelectricity').INetworkTimeSeries} oeTimeSeries
 * @returns {StatsData[]}
 */
export function transformOeToStatsData(oeTimeSeries) {
	const { metric, unit, network_code } = oeTimeSeries;
	const isMislabeledGwh = unit === 'MWh' && METRICS_RETURNED_AS_GWH.has(metric);
	const conversion = isMislabeledGwh ? { divisor: 1, unit: 'GWh' } : unitConversions[unit];
	const divisor = conversion?.divisor ?? 1;
	const outputUnit = conversion?.unit ?? unit;

	return oeTimeSeries.results.map((result) => {
		const cols = /** @type {Record<string, any>} */ (result.columns);
		const renewableCol = cols.renewable;
		const isRenewableGrouping = renewableCol === true || renewableCol === false;

		// secondary_grouping=renewable returns rows discriminated by a boolean
		// `renewable` column rather than a fueltech code. Tag these with a
		// stable synthetic id so callers can look them up by data_type.
		const fuelTech = isRenewableGrouping
			? renewableCol
				? 'renewable_aggregate'
				: 'non_renewable_aggregate'
			: cols.fueltech || result.name;
		const dataType = isRenewableGrouping
			? renewableCol
				? 'generation_renewable_aggregate'
				: 'generation_non_renewable_aggregate'
			: metric;
		const id = `au.fuel_tech.${fuelTech}.${dataType}`;

		const data = result.data.map((d) => (d[1] != null ? d[1] / divisor : null));
		const start = result.data.length > 0 ? result.data[0][0] : '';
		const last = result.data.length > 0 ? result.data[result.data.length - 1][0] : '';

		return /** @type {StatsData} */ ({
			id,
			type: metric,
			fuel_tech: /** @type {FuelTechCode} */ (fuelTech),
			data_type: dataType,
			units: outputUnit,
			network: network_code,
			history: {
				start,
				last,
				interval: oeTimeSeries.interval,
				data
			}
		});
	});
}
