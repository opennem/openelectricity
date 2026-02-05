import Statistic from '$lib/utils/Statistic';
import TimeSeries from '$lib/utils/TimeSeries';
import parseInterval from '$lib/utils/intervals';
import deepCopy from '$lib/utils/deep-copy';
import { loadFuelTechs } from '$lib/fuel_techs.js';

import { fuelTechMap, orderMap } from './groups-region';
import { mutateDatesToStartOfYear, mergeHistoricalEmissionsData } from './utils';

/**
 * @param {{
 * historicalTimeSeries: TimeSeries,
 * projectionTimeSeries: TimeSeries,
 * baseUnit: string,
 * prefix: SiPrefix,
 * displayPrefix: SiPrefix,
 * allowedPrefixes: SiPrefix[],
 * }} param0
 * @returns {ProcessedDataViz}
 */
function combineHistoryProjection({
	historicalTimeSeries,
	projectionTimeSeries,
	baseUnit = '',
	prefix = '',
	displayPrefix = '',
	allowedPrefixes = []
}) {
	const historicalTimeSeriesData = historicalTimeSeries.data;
	const projectionTimeSeriesData = projectionTimeSeries.data;

	// console.log('historicalTimeSeriesData', historicalTimeSeriesData);
	// console.log('projectionTimeSeriesData', projectionTimeSeriesData);

	/********* processing Combined series */
	const lastHistory = historicalTimeSeriesData[historicalTimeSeriesData.length - 1];
	const firstProjection = projectionTimeSeriesData[0];

	if (lastHistory?.time && firstProjection?.time) {
		// if last history time is the same as first projection time, remove the last history data
		const historyData =
			lastHistory?.time === firstProjection?.time
				? historicalTimeSeriesData.slice(0, -1)
				: historicalTimeSeriesData;

		// combine historical and projection data
		const seriesData = [...historyData, ...projectionTimeSeriesData];

		// combine projection and historical series names to make sure they are all included in the time series
		const seriesNames = [
			...new Set([...projectionTimeSeries.seriesNames, ...historicalTimeSeries.seriesNames])
		];

		// combine projection and historical series colours and labels
		/** @type {*} */
		const seriesColours = {};
		/** @type {*} */
		const seriesLabels = {};
		seriesNames.forEach((name) => {
			seriesColours[name] =
				historicalTimeSeries.seriesColours[name] || projectionTimeSeries.seriesColours[name];

			seriesLabels[name] =
				historicalTimeSeries.seriesLabels[name] || projectionTimeSeries.seriesLabels[name];
		});
		/********* end of processing Combined series */

		return {
			seriesData,
			seriesNames,
			nameOptions: [...seriesNames].reverse().map((name) => {
				return { label: name, value: name };
			}),
			seriesColours,
			seriesLabels,
			yDomain: [0, null],
			prefix,
			baseUnit,
			displayPrefix,
			allowedPrefixes,
			chartType: 'line'
		};
	}

	return {
		seriesData: [],
		seriesNames: [],
		seriesColours: {},
		seriesLabels: {},
		nameOptions: [],
		seriesLoadsIds: [],
		yDomain: [],
		prefix,
		baseUnit,
		displayPrefix,
		allowedPrefixes,
		chartType: 'area'
	};
}

/**
 *
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

	/********* processing Projection */
	const projectionsStats = regionsData.map((region) => {
		return {
			id: region.id,
			label: region.label,
			colour: region.colour,
			stats: new Statistic(region.projectionEnergyData, 'projection', 'GWh')
				.invertValues(loadFuelTechs)
				.group(fuelTechMap[group], loadFuelTechs)
				.reorder(orderMap[group] || [])
		};
	});

	// derive net generation
	// using total sources minus total load
	// and create new stats data with all the regions
	/** @type {StatsData[]} */
	const regionProjectionStats = [];
	projectionsStats.forEach((projection) => {
		const netGenerationStats = deepCopy(projection.stats.data[0]);
		netGenerationStats.id = `${projection.id}`;
		netGenerationStats.code = null;
		netGenerationStats.fuel_tech = null;
		netGenerationStats.label = projection.label;
		netGenerationStats.colour = projection.colour;

		if (includeBatteryAndLoads) {
			const dataLoads = projection.stats.data[0].projection.data;
			const dataSources = projection.stats.data[1].projection.data;
			const netGenerationData = dataSources.map((/** @type {any} */ d, /** @type {any} */ i) => d + dataLoads[i]); // loads are already negative

			netGenerationStats.projection.data = netGenerationData;
		}

		regionProjectionStats.push(netGenerationStats);
	});

	const projectionTimeSeries = new TimeSeries(
		regionProjectionStats,
		parseInterval('1Y'),
		'projection',
		undefined,
		undefined
	).transform();

	// match FY dates, use start of year as display (i.e. 1 Jan 2024 == FY 2024)
	projectionTimeSeries.data = mutateDatesToStartOfYear(projectionTimeSeries.data, 1);
	/********* end of processing Projection */

	/********* processing Historical */
	const historicalStats = regionsData.map((region) => {
		return {
			id: region.id,
			label: region.label,
			colour: region.colour,
			stats: new Statistic(region.historicalEnergyData, 'history', 'GWh')
				.invertValues(loadFuelTechs)
				.group(fuelTechMap[group], loadFuelTechs)
				.reorder(orderMap[group] || [])
		};
	});

	// derive net generation
	// using total sources minus total load
	// and create new stats data with all the regions
	/** @type {StatsData[]} */
	const regionHistoricalStats = [];
	historicalStats.forEach((history) => {
		const netGenerationStats = deepCopy(history.stats.data[0]);
		netGenerationStats.id = `${history.id}`;
		netGenerationStats.code = null;
		netGenerationStats.fuel_tech = null;
		netGenerationStats.label = history.label;
		netGenerationStats.colour = history.colour;

		if (includeBatteryAndLoads) {
			const dataLoads = history.stats.data[0].history.data;
			const dataSources = history.stats.data[1].history.data;
			const netGenerationData = dataSources.map((/** @type {any} */ d, /** @type {any} */ i) => d + dataLoads[i]); // loads are already negative

			netGenerationStats.history.data = netGenerationData;
		}

		regionHistoricalStats.push(netGenerationStats);
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

	// match FY dates, use start of year as display (i.e. 1 Jan 2024 == FY 2024) and filter out years outside of 2010-2024
	historicalTimeSeries.data = mutateDatesToStartOfYear(historicalTimeSeries.data).filter(
		(d) => d.date.getFullYear() < 2025 && d.date.getFullYear() > 2009
	);
	/********* end of processing History */

	return combineHistoryProjection({
		historicalTimeSeries,
		projectionTimeSeries,
		baseUnit: projectionsStats[0].stats.baseUnit,
		prefix: projectionsStats[0].stats.prefix,
		displayPrefix: 'T',
		allowedPrefixes: ['G', 'T']
	});
}

/**
 *
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

	/********* processing Projection */
	const projectionsStats = regionsData.map((region) => {
		return {
			id: region.id,
			label: region.label,
			colour: region.colour,
			stats: new Statistic(region.projectionCapacityData, 'projection', 'MW')
				.invertValues(loadFuelTechs)
				.group(fuelTechMap[group], loadFuelTechs)
				.reorder(orderMap[group] || [])
		};
	});

	// derive net generation
	// using total sources minus total load
	// and create new stats data with all the regions
	/** @type {StatsData[]} */
	const regionProjectionStats = [];
	projectionsStats.forEach((projection) => {
		// const netGenerationStats = deepCopy(projection.stats.data[0]);
		// netGenerationStats.id = `${projection.id}`;
		// netGenerationStats.code = null;
		// netGenerationStats.fuel_tech = null;
		// netGenerationStats.label = projection.label;
		// netGenerationStats.colour = projection.colour;

		// if (includeBatteryAndLoads) {
		// 	const dataLoads = projection.stats.data[0].projection.data;
		// 	const dataSources = projection.stats.data[1].projection.data;
		// 	const netGenerationData = dataSources.map((d, i) => d + dataLoads[i]); // loads are already negative

		// 	netGenerationStats.projection.data = netGenerationData;
		// }

		const index = includeBatteryAndLoads ? 1 : 0;
		const capacityStats = projection.stats.data[index]
			? deepCopy(projection.stats.data[index])
			: deepCopy(projection.stats.data[0]);
		capacityStats.id = `${projection.id}`;
		capacityStats.code = null;
		capacityStats.fuel_tech = null;
		capacityStats.label = projection.label;
		capacityStats.colour = projection.colour;

		regionProjectionStats.push(capacityStats);
	});

	const projectionTimeSeries = new TimeSeries(
		regionProjectionStats,
		parseInterval('1Y'),
		'projection',
		undefined,
		undefined
	).transform();

	// match FY dates, use start of year as display (i.e. 1 Jan 2024 == FY 2024)
	projectionTimeSeries.data = mutateDatesToStartOfYear(projectionTimeSeries.data, 1);
	/********* end of processing Projection */

	/********* processing Historical */
	const historicalStats = regionsData.map((region) => {
		return {
			id: region.id,
			label: region.label,
			colour: region.colour,
			stats: new Statistic(region.historicalCapacityData, 'history', 'MW')
				.invertValues(loadFuelTechs)
				.group(fuelTechMap[group], loadFuelTechs)
				.reorder(orderMap[group] || [])
		};
	});

	// derive net generation
	// using total sources minus total load
	// and create new stats data with all the regions
	/** @type {StatsData[]} */
	const regionHistoricalStats = [];
	historicalStats.forEach((history) => {
		const netGenerationStats = deepCopy(history.stats.data[0]);
		netGenerationStats.id = `${history.id}`;
		netGenerationStats.code = null;
		netGenerationStats.fuel_tech = null;
		netGenerationStats.label = history.label;
		netGenerationStats.colour = history.colour;

		if (includeBatteryAndLoads) {
			const totalSources = history.stats.data.find((/** @type {any} */ d) => d.fuel_tech === 'total_sources');
			const totalLoads = history.stats.data.find((/** @type {any} */ d) => d.fuel_tech === 'total_loads');
			const dataLoads = totalLoads ? totalLoads.history.data : [];
			const dataSources = totalSources.history.data;
			const netGenerationData = dataSources.map((/** @type {any} */ d, /** @type {any} */ i) => d + dataLoads[i]); // loads are already negative

			netGenerationStats.history.data = netGenerationData;
		}

		regionHistoricalStats.push(netGenerationStats);
	});

	const historicalTimeSeries = new TimeSeries(
		regionHistoricalStats,
		parseInterval('1Y'),
		'history',
		undefined,
		undefined
	).transform();

	// match FY dates, use start of year as display (i.e. 1 Jan 2024 == FY 2024) and filter out years outside of 2010-2024
	historicalTimeSeries.data = mutateDatesToStartOfYear(historicalTimeSeries.data).filter(
		(d) => d.date.getFullYear() < 2025 && d.date.getFullYear() > 2009
	);
	/********* end of processing History */

	return combineHistoryProjection({
		historicalTimeSeries,
		projectionTimeSeries,
		baseUnit: projectionsStats[0].stats.baseUnit,
		prefix: projectionsStats[0].stats.prefix,
		displayPrefix: 'G',
		allowedPrefixes: ['M', 'G']
	});
}

/**
 *
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
	const projectionsStats = regionsData.map((region) => {
		return {
			id: region.id,
			label: region.label,
			colour: region.colour,
			stats: new Statistic(region.projectionEmissionsData, 'projection', 'tCO2e')
		};
	});

	/** @type {StatsData[]} */
	const regionProjectionStats = [];

	projectionsStats.forEach((projection) => {
		if (projection.stats.data.length) {
			const emissionStats = deepCopy(projection.stats.data[0]);
			emissionStats.id = `${projection.id}`;
			emissionStats.code = null;
			emissionStats.fuel_tech = null;
			emissionStats.label = projection.label;
			emissionStats.colour = projection.colour;

			regionProjectionStats.push(emissionStats);
		}
	});

	const projectionTimeSeries = new TimeSeries(
		regionProjectionStats,
		parseInterval('1Y'),
		'projection',
		undefined,
		undefined
	).transform();

	// match FY dates, use start of year as display (i.e. 1 Jan 2024 == FY 2024)
	projectionTimeSeries.data = mutateDatesToStartOfYear(projectionTimeSeries.data, 1);
	/********* end of processing Projection */

	// console.log('emissions projectionsStats', projectionsStats);
	// console.log('emissions regionProjectionStats', regionProjectionStats);
	// console.log('emissions projectionTimeSeries', projectionTimeSeries);

	/********* processing Historical */
	const historicalStats = regionsData.map((region) => {
		// console.log('region.historicalEmissionsData', region, region.historicalEmissionsData);
		const merged = mergeHistoricalEmissionsData(
			region.historicalEmissionsData,
			includeBatteryAndLoads
		);
		const historicalStats = new Statistic(merged, 'history', 'tCO2e');
		historicalStats.data[0].id = region.id;
		historicalStats.data[0].label = region.label;
		historicalStats.data[0].colour = region.colour;

		return {
			id: region.id,
			label: region.label,
			colour: region.colour,
			stats: historicalStats
		};
	});

	// derive net emissions
	// using total sources minus total load
	// and create new stats data with all the regions
	/** @type {StatsData[]} */
	const regionHistoricalStats = [];
	historicalStats.forEach((history) => {
		regionHistoricalStats.push(history.stats.data[0]);
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

	// console.log('emissions historicalStats', historicalStats);
	// console.log('emissions regionHistoricalStats', regionHistoricalStats);
	// console.log('emissions historicalTimeSeries', historicalTimeSeries);

	// match FY dates, use start of year as display (i.e. 1 Jan 2024 == FY 2024) and filter out years outside of 2010-2024
	historicalTimeSeries.data = mutateDatesToStartOfYear(historicalTimeSeries.data).filter(
		(d) => d.date.getFullYear() < 2025 && d.date.getFullYear() > 2009
	);
	/********* end of processing History */

	return combineHistoryProjection({
		historicalTimeSeries,
		projectionTimeSeries,
		baseUnit: projectionsStats[0].stats.baseUnit,
		prefix: projectionsStats[0].stats.prefix,
		displayPrefix: 'k',
		allowedPrefixes: ['k', 'M']
	});
}

/**
 *
 * @param {{processedEmissions: ProcessedDataViz, processedEnergy: ProcessedDataViz}} param0
 * @returns {ProcessedDataViz}
 */
function intensity({ processedEmissions, processedEnergy }) {
	const processedIntensity = deepCopy(processedEmissions);
	const seriesNames = processedIntensity.seriesNames;

	processedIntensity.seriesData = processedEmissions.seriesData.map((/** @type {any} */ d, /** @type {any} */ i) => {
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

	processedIntensity.yDomain = [0, 1200];
	processedIntensity.chartType = 'line';
	processedIntensity.prefix = '';
	processedIntensity.baseUnit = 'kgCO2e/MWh';
	processedIntensity.displayPrefix = '';
	processedIntensity.allowedPrefixes = [];

	return processedIntensity;
}

export default {
	generation,
	capacity,
	emissions,
	intensity
};
