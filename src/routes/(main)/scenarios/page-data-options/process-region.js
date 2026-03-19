import TimeSeries from '$lib/utils/TimeSeries';
import parseInterval from '$lib/utils/intervals';
import { loadFuelTechs } from '$lib/fuel_techs.js';

import { fuelTechMap } from './groups-region';
import sumFuelTechData from './sum-fuel-tech-data';
import combineHistoryProjection from './combine-history-projection';
import { mutateDatesToStartOfYear, mergeHistoricalEmissionsData, currentFinancialYear } from './utils';

/**
 * @param {{
 * regionsData: {
 * 	id: string,
 * 	label: string,
 * 	colour: string,
 * 	projectionEnergyData: StatsData[],
 * 	projectionCapacityData: StatsData[],
 * 	projectionEmissionsData: StatsData[],
 * 	historicalEnergyData: StatsData[],
 * 	historicalCapacityData: StatsData[],
 * 	historicalEmissionsData: StatsData[]
 * }[],
 * includeBatteryAndLoads: boolean}} param0
 * @returns
 */
function generation({ regionsData, includeBatteryAndLoads }) {
	const group = includeBatteryAndLoads ? 'sources_loads' : 'sources_without_battery';
	const groupMap = fuelTechMap[group];

	/********* processing Projection */
	/** @type {StatsData[]} */
	const regionProjectionStats = [];
	regionsData.forEach((region) => {
		const netStats = sumFuelTechData(region.projectionEnergyData, 'projection', groupMap, {
			negateFuelTechs: loadFuelTechs,
			id: region.id,
			label: region.label,
			colour: region.colour
		});
		if (netStats) regionProjectionStats.push(netStats);
	});

	const projectionTimeSeries = new TimeSeries(
		regionProjectionStats,
		parseInterval('1Y'),
		'projection',
		undefined,
		undefined
	).transform();

	projectionTimeSeries.data = mutateDatesToStartOfYear(projectionTimeSeries.data, 1);
	/********* end of processing Projection */

	/********* processing Historical */
	/** @type {StatsData[]} */
	const regionHistoricalStats = [];
	regionsData.forEach((region) => {
		const netStats = sumFuelTechData(region.historicalEnergyData, 'history', groupMap, {
			negateFuelTechs: loadFuelTechs,
			id: region.id,
			label: region.label,
			colour: region.colour
		});
		if (netStats) regionHistoricalStats.push(netStats);
	});

	const historicalTimeSeries = new TimeSeries(
		regionHistoricalStats,
		parseInterval('1M'),
		'history',
		undefined,
		undefined
	)
		.transform()
		.rollup(parseInterval('FY'));

	historicalTimeSeries.data = mutateDatesToStartOfYear(historicalTimeSeries.data).filter(
		(d) => d.date.getFullYear() > 2009 && d.date.getFullYear() < currentFinancialYear
	);
	/********* end of processing History */

	return combineHistoryProjection({
		historicalTimeSeries,
		projectionTimeSeries,
		baseUnit: 'Wh',
		prefix: /** @type {SiPrefix} */ ('G'),
		displayPrefix: 'T',
		allowedPrefixes: ['G', 'T'],
		chartType: 'line'
	});
}

/**
 * @param {{
 * regionsData: {
 * 	id: string,
 * 	label: string,
 * 	colour: string,
 * 	projectionEnergyData: StatsData[],
 * 	projectionCapacityData: StatsData[],
 * 	projectionEmissionsData: StatsData[],
 * 	historicalEnergyData: StatsData[],
 * 	historicalCapacityData: StatsData[],
 * 	historicalEmissionsData: StatsData[]
 * }[],
 * includeBatteryAndLoads: boolean}} param0
 * @returns
 */
function capacity({ regionsData, includeBatteryAndLoads }) {
	const group = includeBatteryAndLoads ? 'sources_loads' : 'sources_without_battery';
	const groupMap = fuelTechMap[group];

	/********* processing Projection */
	/** @type {StatsData[]} */
	const regionProjectionStats = [];
	regionsData.forEach((region) => {
		// For capacity, only include sources (exclude loads group)
		const stats = sumFuelTechData(region.projectionCapacityData, 'projection', groupMap, {
			excludeGroups: ['total_loads'],
			id: region.id,
			label: region.label,
			colour: region.colour
		});
		if (stats) regionProjectionStats.push(stats);
	});

	const projectionTimeSeries = new TimeSeries(
		regionProjectionStats,
		parseInterval('1Y'),
		'projection',
		undefined,
		undefined
	).transform();

	projectionTimeSeries.data = mutateDatesToStartOfYear(projectionTimeSeries.data, 1);
	/********* end of processing Projection */

	/********* processing Historical */
	/** @type {StatsData[]} */
	const regionHistoricalStats = [];
	regionsData.forEach((region) => {
		const stats = sumFuelTechData(region.historicalCapacityData, 'history', groupMap, {
			excludeGroups: ['total_loads'],
			id: region.id,
			label: region.label,
			colour: region.colour
		});
		if (stats) regionHistoricalStats.push(stats);
	});

	const historicalTimeSeries = new TimeSeries(
		regionHistoricalStats,
		parseInterval('1Y'),
		'history',
		undefined,
		undefined
	).transform();

	historicalTimeSeries.data = mutateDatesToStartOfYear(historicalTimeSeries.data).filter(
		(d) => d.date.getFullYear() > 2009 && d.date.getFullYear() < currentFinancialYear
	);
	/********* end of processing History */

	return combineHistoryProjection({
		historicalTimeSeries,
		projectionTimeSeries,
		baseUnit: 'W',
		prefix: /** @type {SiPrefix} */ ('M'),
		displayPrefix: 'G',
		allowedPrefixes: ['M', 'G'],
		chartType: 'line'
	});
}

/**
 * @param {{
 * regionsData: {
 * 	id: string,
 * 	label: string,
 * 	colour: string,
 * 	projectionEnergyData: StatsData[],
 * 	projectionCapacityData: StatsData[],
 * 	projectionEmissionsData: StatsData[],
 * 	historicalEnergyData: StatsData[],
 * 	historicalCapacityData: StatsData[],
 * 	historicalEmissionsData: StatsData[]
 * }[],
 * includeBatteryAndLoads: boolean}} param0
 * @returns
 */
function emissions({ regionsData, includeBatteryAndLoads }) {
	/********* processing Projection */
	/** @type {StatsData[]} */
	const regionProjectionStats = [];
	regionsData.forEach((region) => {
		if (region.projectionEmissionsData.length) {
			const first = region.projectionEmissionsData[0];
			regionProjectionStats.push({
				...first,
				id: region.id,
				code: null,
				fuel_tech: null,
				label: region.label,
				colour: region.colour
			});
		}
	});

	const projectionTimeSeries = new TimeSeries(
		regionProjectionStats,
		parseInterval('1Y'),
		'projection',
		undefined,
		undefined
	).transform();

	projectionTimeSeries.data = mutateDatesToStartOfYear(projectionTimeSeries.data, 1);
	/********* end of processing Projection */

	/********* processing Historical */
	/** @type {StatsData[]} */
	const regionHistoricalStats = [];
	regionsData.forEach((region) => {
		const merged = mergeHistoricalEmissionsData(
			region.historicalEmissionsData,
			includeBatteryAndLoads
		);
		const stats = merged[0];
		stats.id = region.id;
		stats.label = region.label;
		stats.colour = region.colour;
		regionHistoricalStats.push(stats);
	});

	const historicalTimeSeries = new TimeSeries(
		regionHistoricalStats,
		parseInterval('1M'),
		'history',
		undefined,
		undefined
	)
		.transform()
		.rollup(parseInterval('FY'));

	historicalTimeSeries.data = mutateDatesToStartOfYear(historicalTimeSeries.data).filter(
		(d) => d.date.getFullYear() > 2009 && d.date.getFullYear() < currentFinancialYear
	);
	/********* end of processing History */

	return combineHistoryProjection({
		historicalTimeSeries,
		projectionTimeSeries,
		baseUnit: 'tCO2e',
		prefix: /** @type {SiPrefix} */ (''),
		displayPrefix: 'k',
		allowedPrefixes: ['k', 'M'],
		chartType: 'line'
	});
}

/**
 * @param {{processedEmissions: ProcessedDataViz, processedEnergy: ProcessedDataViz}} param0
 * @returns {ProcessedDataViz}
 */
function intensity({ processedEmissions, processedEnergy }) {
	const seriesNames = processedEmissions.seriesNames;

	const seriesData = processedEmissions.seriesData.map((/** @type {any} */ d, /** @type {any} */ i) => {
		/** @type {any} */
		const obj = {
			date: d.date,
			time: d.time
		};

		seriesNames.forEach((/** @type {any} */ name) => {
			if (d[name] && /** @type {any} */ (processedEnergy.seriesData[i])[name]) {
				obj[name] = d[name] / /** @type {any} */ (processedEnergy.seriesData[i])[name];
			}
		});

		return obj;
	});

	return {
		...processedEmissions,
		seriesData,
		yDomain: [0, 1200],
		chartType: 'line',
		prefix: /** @type {SiPrefix} */ (''),
		baseUnit: 'kgCO2e/MWh',
		displayPrefix: /** @type {SiPrefix} */ (''),
		allowedPrefixes: /** @type {SiPrefix[]} */ ([])
	};
}

export default {
	generation,
	capacity,
	emissions,
	intensity
};
