import { rowsFromSeriesMaps } from '$lib/components/charts/v2/series-rows.js';
import { stripDateTimezone } from '$lib/utils/date-format.js';

const COMPARISON_COLOURS = ['#4F5FD7', '#E78114', '#069FAF', '#A078D7', '#2C7629', '#E15C34'];

/**
 * Aggregate unit-level OE facility data into one series per facility.
 * @param {any} response
 * @param {{ metric: string, facilities: Array<{code:string,name:string,units?:Array<{code:string,dispatch_type?:string}>}>, networkTimezone:string }} config
 */
export function processFacilityComparison(response, config) {
	if (!response?.data) return null;
	const facilitiesByCode = new Map(config.facilities.map((facility) => [facility.code, facility]));
	const unitToFacility = new Map();
	const loadUnits = new Set();
	for (const facility of config.facilities) {
		for (const unit of facility.units ?? []) {
			unitToFacility.set(unit.code, facility.code);
			if (unit.dispatch_type === 'LOAD') loadUnits.add(unit.code);
		}
	}

	/** @type {Map<string, Map<number, number>>} */
	const seriesMaps = new Map(config.facilities.map((facility) => [facility.code, new Map()]));
	const timestamps = new Set();

	for (const metric of response.data) {
		if (metric.metric !== config.metric) continue;
		for (const series of metric.results ?? []) {
			const unitCode = series.columns?.unit_code;
			const facilityCode = series.columns?.facility_code || unitToFacility.get(unitCode);
			if (!facilityCode || !facilitiesByCode.has(facilityCode)) continue;
			const values = seriesMaps.get(facilityCode);
			if (!values) continue;
			for (const [timestamp, value] of series.data ?? []) {
				if (value == null) continue;
				const time = new Date(stripDateTimezone(timestamp) + config.networkTimezone).getTime();
				if (!Number.isFinite(time)) continue;
				const signed = loadUnits.has(unitCode) ? -value : value;
				values.set(time, (values.get(time) ?? 0) + signed);
				timestamps.add(time);
			}
		}
	}

	const seriesNames = config.facilities
		.map((facility) => facility.code)
		.filter((code) => (seriesMaps.get(code)?.size ?? 0) > 0);
	if (!seriesNames.length) return null;
	const seriesLabels = Object.fromEntries(
		config.facilities.map((facility) => [facility.code, facility.name])
	);
	const seriesColours = Object.fromEntries(
		seriesNames.map((code, index) => [code, COMPARISON_COLOURS[index % COMPARISON_COLOURS.length]])
	);

	return {
		data: rowsFromSeriesMaps(seriesMaps, timestamps, seriesNames),
		seriesNames,
		seriesLabels,
		seriesColours
	};
}
