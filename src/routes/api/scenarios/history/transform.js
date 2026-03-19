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
 * Transform OE API INetworkTimeSeries response into StatsData[] format
 * that the scenarios processing pipeline expects.
 *
 * @param {import('openelectricity').INetworkTimeSeries} oeTimeSeries
 * @returns {StatsData[]}
 */
export function transformOeToStatsData(oeTimeSeries) {
	const { metric, unit, network_code } = oeTimeSeries;
	const conversion = unitConversions[unit];
	const divisor = conversion?.divisor ?? 1;
	const outputUnit = conversion?.unit ?? unit;

	return oeTimeSeries.results.map((result) => {
		const fuelTech = result.columns.fueltech || result.name;
		const id = `au.fuel_tech.${fuelTech}.${metric}`;

		const data = result.data.map((d) => (d[1] != null ? d[1] / divisor : null));
		const start = result.data.length > 0 ? result.data[0][0] : '';
		const last = result.data.length > 0 ? result.data[result.data.length - 1][0] : '';

		return /** @type {StatsData} */ ({
			id,
			type: metric,
			fuel_tech: /** @type {FuelTechCode} */ (fuelTech),
			data_type: metric,
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
