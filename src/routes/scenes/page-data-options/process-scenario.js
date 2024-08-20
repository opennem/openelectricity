import Statistic from '$lib/utils/Statistic';
import TimeSeries from '$lib/utils/TimeSeries';
import parseInterval from '$lib/utils/intervals';
import deepCopy from '$lib/utils/deep-copy';
import { loadFuelTechs } from '$lib/fuel_techs.js';

import { fuelTechMap, orderMap } from './groups-scenario';
import { scenarioLabels } from './descriptions';
import { scenarioColourMap } from './models';
import { mutateDatesToStartOfYear } from './utils';

/**
 * @param {{
 * historicalTimeSeries: TimeSeries,
 * projectionTimeSeries: TimeSeries,
 * }} param0
 * @returns {ProcessedDataViz}
 */
function combineHistoryProjection({ historicalTimeSeries, projectionTimeSeries }) {
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
		yDomain: []
	};
}

/**
 *
 * @param {{
 * projections: {
 * 	id: string,
 * 	model: string,
 * 	scenario: string,
 * 	pathway: string,
 * 	projectionEnergyData: StatsData[],
 * 	projectionCapacityData: StatsData[],
 * 	projectionEmissionsData: StatsData[]
 * }[], history:  StatsData[], group: string}} param0
 * @returns
 */
function generation({ projections, history, group }) {
	/********* processing Projection */
	const projectionsStats = projections.map((projection) => {
		return {
			id: projection.id,
			model: projection.model,
			scenario: projection.scenario,
			pathway: projection.pathway,
			stats: new Statistic(projection.projectionEnergyData, 'projection', 'GWh')
				.invertValues(loadFuelTechs)
				.group(fuelTechMap[group], loadFuelTechs)
				.reorder(orderMap[group] || [])
		};
	});

	// derive net generation
	// using total sources minus total load
	// and create new stats data with all the scearios
	/** @type {StatsData[]} */
	const scenarioProjectionStats = [];

	projectionsStats.forEach((projection) => {
		const dataLoads = projection.stats.data[0].projection.data;
		const dataSources = projection.stats.data[1].projection.data;
		const netGenerationData = dataSources.map((d, i) => d + dataLoads[i]); // loads are already negative

		const netGenerationStats = deepCopy(projection.stats.data[0]);
		netGenerationStats.id = `${projection.id}`;
		netGenerationStats.code = null;
		netGenerationStats.fuel_tech = null;
		netGenerationStats.label = scenarioLabels[projection.model][projection.scenario];
		netGenerationStats.colour = scenarioColourMap[projection.id];
		netGenerationStats.projection.data = netGenerationData;

		scenarioProjectionStats.push(netGenerationStats);
	});

	const projectionTimeSeries = new TimeSeries(
		scenarioProjectionStats,
		parseInterval('1Y'),
		'projection',
		null,
		null
	).transform();

	// match FY dates, use start of year as display (i.e. 1 Jan 2024 == FY 2024)
	projectionTimeSeries.data = mutateDatesToStartOfYear(projectionTimeSeries.data, 1);
	/********* end of processing Projection */

	/********* processing Historical */
	const historicalStats = new Statistic(history, 'history', 'GWh')
		.invertValues(loadFuelTechs)
		.group(fuelTechMap[group], loadFuelTechs)
		.reorder(orderMap[group] || []);

	const dataLoads = historicalStats.data[0].history.data;
	const dataSources = historicalStats.data[1].history.data;
	const netGenerationData = dataSources.map((d, i) => d + dataLoads[i]); // loads are already negative
	const netGenerationStats = deepCopy(historicalStats.data[0]);
	netGenerationStats.id = `historical`;
	netGenerationStats.code = null;
	netGenerationStats.fuel_tech = null;
	netGenerationStats.label = 'Historical';
	netGenerationStats.colour = '#000';
	netGenerationStats.history.data = netGenerationData;

	const historicalTimeSeries = new TimeSeries(
		[netGenerationStats],
		parseInterval('1M'),
		'history',
		null,
		null
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
		projectionTimeSeries
	});
}

/**
 *
 * @param {{
 * projections: {
 * 	id: string,
 * 	model: string,
 * 	scenario: string,
 * 	pathway: string,
 * 	projectionEnergyData: StatsData[],
 * 	projectionCapacityData: StatsData[],
 * 	projectionEmissionsData: StatsData[]
 * }[], history:  StatsData[], group: string}} param0
 * @returns
 */
function capacity({ projections, history, group }) {
	/********* processing Projection */
	const projectionsStats = projections.map((projection) => {
		return {
			id: projection.id,
			model: projection.model,
			scenario: projection.scenario,
			pathway: projection.pathway,
			stats: new Statistic(projection.projectionCapacityData, 'projection', 'MW')
				.group(fuelTechMap[group])
				.reorder(orderMap[group] || [])
		};
	});

	// set the capacity data
	// using total sources
	// and create new stats data with all the scearios
	/** @type {StatsData[]} */
	const scenarioProjectionStats = [];

	projectionsStats.forEach((projection) => {
		// total_sources is the second data in the projection stats
		const capacityStats = deepCopy(projection.stats.data[1]);
		capacityStats.id = `${projection.id}`;
		capacityStats.code = null;
		capacityStats.fuel_tech = null;
		capacityStats.label = scenarioLabels[projection.model][projection.scenario];
		capacityStats.colour = scenarioColourMap[projection.id];

		scenarioProjectionStats.push(capacityStats);
	});

	const projectionTimeSeries = new TimeSeries(
		scenarioProjectionStats,
		parseInterval('1Y'),
		'projection',
		null,
		null
	).transform();

	// match FY dates, use start of year as display (i.e. 1 Jan 2024 == FY 2024)
	projectionTimeSeries.data = mutateDatesToStartOfYear(projectionTimeSeries.data, 1);
	/********* end of processing Projection */

	// console.log('capacity projectionsStats', projectionsStats);
	// console.log('capacity scenarioProjectionStats', scenarioProjectionStats);
	// console.log('capacity projectionTimeSeries', projectionTimeSeries);

	/********* processing Historical */
	const historicalStats = new Statistic(history, 'history', 'MW')
		.invertValues(loadFuelTechs)
		.group(fuelTechMap[group], loadFuelTechs)
		.reorder(orderMap[group] || []);

	// total_sources is the second data in the historical stats
	const dataLoads = historicalStats.data[0].history.data;
	const dataSources = historicalStats.data[1].history.data;
	const netCapacityData = dataSources.map((d, i) => d + dataLoads[i]); // loads are already negative
	const netCapacityStats = deepCopy(historicalStats.data[0]);
	netCapacityStats.id = `historical`;
	netCapacityStats.code = null;
	netCapacityStats.fuel_tech = null;
	netCapacityStats.label = 'Historical';
	netCapacityStats.colour = '#000';
	netCapacityStats.history.data = netCapacityData;

	const historicalTimeSeries = new TimeSeries(
		[netCapacityStats],
		parseInterval('1Y'),
		'history',
		null,
		null
	).transform();

	// match FY dates, use start of year as display (i.e. 1 Jan 2024 == FY 2024) and filter out years outside of 2010-2024
	historicalTimeSeries.data = mutateDatesToStartOfYear(historicalTimeSeries.data).filter(
		(d) => d.date.getFullYear() < 2025 && d.date.getFullYear() > 2009
	);
	/********* end of processing History */

	// console.log('capacity historicalStats', historicalStats);
	// console.log('capacity historicalTimeSeries', historicalTimeSeries);

	return combineHistoryProjection({
		historicalTimeSeries,
		projectionTimeSeries
	});
}

/**
 *
 * @param {{
 * projections: {
 * 	id: string,
 * 	model: string,
 * 	scenario: string,
 * 	pathway: string,
 * 	projectionEnergyData: StatsData[],
 * 	projectionCapacityData: StatsData[],
 * 	projectionEmissionsData: StatsData[]
 * }[], history:  StatsData[], group: string}} param0
 * @returns
 */
function emissions({ projections, history, group }) {
	/********* processing Projection */
	const projectionsStats = projections.map((projection) => {
		return {
			id: projection.id,
			model: projection.model,
			scenario: projection.scenario,
			pathway: projection.pathway,
			stats: new Statistic(projection.projectionEmissionsData, 'projection', 'tCO2e')
		};
	});

	/** @type {StatsData[]} */
	const scenarioProjectionStats = [];

	projectionsStats.forEach((projection) => {
		// total_sources is the second data in the projection stats
		const emissionStats = deepCopy(projection.stats.data[0]);
		emissionStats.id = `${projection.id}`;
		emissionStats.code = null;
		emissionStats.fuel_tech = null;
		emissionStats.label = scenarioLabels[projection.model][projection.scenario];
		emissionStats.colour = scenarioColourMap[projection.id];

		scenarioProjectionStats.push(emissionStats);
	});

	const projectionTimeSeries = new TimeSeries(
		scenarioProjectionStats,
		parseInterval('1Y'),
		'projection',
		null,
		null
	).transform();

	// match FY dates, use start of year as display (i.e. 1 Jan 2024 == FY 2024)
	projectionTimeSeries.data = mutateDatesToStartOfYear(projectionTimeSeries.data, 1);
	/********* end of processing Projection */

	// console.log('emissions projectionsStats', projectionsStats);
	// console.log('emissions projectionTimeSeries', projectionTimeSeries);

	/********* processing Historical */
	const historicalStats = new Statistic(history, 'history', 'tCO2e')
		.invertValues(loadFuelTechs)
		.group(fuelTechMap[group], loadFuelTechs)
		.reorder(orderMap[group] || []);

	const dataLoads = historicalStats.data[0].history.data;
	const dataSources = historicalStats.data[1].history.data;
	const netEmissionsData = dataSources.map((d, i) => d + dataLoads[i]); // loads are already negative
	const netEmissionsStats = deepCopy(historicalStats.data[0]);
	netEmissionsStats.id = `historical`;
	netEmissionsStats.code = null;
	netEmissionsStats.fuel_tech = null;
	netEmissionsStats.label = 'Historical';
	netEmissionsStats.colour = '#000';
	netEmissionsStats.history.data = netEmissionsData;

	const historicalTimeSeries = new TimeSeries(
		[netEmissionsStats],
		parseInterval('1M'),
		'history',
		null,
		null
	)
		.transform()
		.rollup(parseInterval('FY'));

	// match FY dates, use start of year as display (i.e. 1 Jan 2024 == FY 2024) and filter out years outside of 2010-2024
	historicalTimeSeries.data = mutateDatesToStartOfYear(historicalTimeSeries.data).filter(
		(d) => d.date.getFullYear() < 2025 && d.date.getFullYear() > 2009
	);
	/********* end of processing History */

	// console.log('emissions history', history);
	// console.log('emissions historicalStats', historicalStats);
	// console.log('emissions netEmissionsStats', netEmissionsStats);
	// console.log('emissions historicalTimeSeries', historicalTimeSeries);

	return combineHistoryProjection({
		historicalTimeSeries,
		projectionTimeSeries
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

	processedIntensity.seriesData = processedEmissions.seriesData.map((d, i) => {
		const obj = {
			date: d.date,
			time: d.time
		};

		seriesNames.forEach((name) => {
			if (d[name] && processedEnergy.seriesData[i][name]) {
				obj[name] = d[name] / processedEnergy.seriesData[i][name];
			}
		});

		return obj;
	});

	return processedIntensity;
}

export default {
	generation,
	capacity,
	emissions,
	intensity
};
