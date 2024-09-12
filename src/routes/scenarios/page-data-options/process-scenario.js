import { color } from 'd3-color';
import Statistic from '$lib/utils/Statistic';
import TimeSeries from '$lib/utils/TimeSeries';
import parseInterval from '$lib/utils/intervals';
import deepCopy from '$lib/utils/deep-copy';
import { loadFuelTechs } from '$lib/fuel_techs.js';

import { fuelTechMap, orderMap } from './groups-scenario';
import { scenarioLabels } from './descriptions';
import { scenarioColourMap } from './models';
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
		// if last history time is the same as first projection time, remove the first projection data
		// this is to avoid duplicate data points for comparing multiple scenarios of different years
		const projectionData =
			lastHistory?.time === firstProjection?.time
				? projectionTimeSeriesData.slice(1)
				: projectionTimeSeriesData;

		// combine historical and projection data
		const seriesData = [...historicalTimeSeriesData, ...projectionData];

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
 * projections: {
 * 	id: string,
 * 	model: string,
 * 	scenario: string,
 * 	pathway: string,
 * 	projectionEnergyData: StatsData[],
 * 	projectionCapacityData: StatsData[],
 * 	projectionEmissionsData: StatsData[]
 * }[], history:  StatsData[], includeBatteryAndLoads: boolean}} param0
 * @returns
 */
function generation({ projections, history, includeBatteryAndLoads }) {
	const group = includeBatteryAndLoads ? 'sources_loads' : 'sources_without_battery';

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
		if (projection.stats.data.length) {
			const netGenerationStats = deepCopy(projection.stats.data[0]);
			netGenerationStats.id = `${projection.id}`;
			netGenerationStats.code = null;
			netGenerationStats.fuel_tech = null;
			netGenerationStats.label = scenarioLabels[projection.model][projection.scenario];
			netGenerationStats.colour = scenarioColourMap[`${projection.model}-${projection.scenario}`];

			if (includeBatteryAndLoads) {
				const dataLoads = projection.stats.data[0].projection.data;
				const dataSources = projection.stats.data[1].projection.data;
				const netGenerationData = dataSources.map((d, i) => d + dataLoads[i]); // loads are already negative
				netGenerationStats.projection.data = netGenerationData;
			}

			scenarioProjectionStats.push(netGenerationStats);
		}
	});

	// group by start date and create time series for each start date
	const starts = [...new Set(scenarioProjectionStats.map((d) => d.projection?.start))].map((d) => {
		const stats = scenarioProjectionStats.filter((s) => s.projection?.start === d);
		const timeSeries = new TimeSeries(
			stats,
			parseInterval('1Y'),
			'projection',
			undefined,
			undefined
		).transform();

		// match FY dates, use start of year as display (i.e. 1 Jan 2024 == FY 2024)
		timeSeries.data = mutateDatesToStartOfYear(timeSeries.data, 1);

		return {
			start: d,
			stats,
			timeSeries
		};
	});

	/** @type {TimeSeriesData[]} */
	let mergedTimeSeriesData = [];
	starts.forEach((start) => {
		if (mergedTimeSeriesData.length === 0) {
			mergedTimeSeriesData = [...start.timeSeries.data];
		} else {
			start.timeSeries.data.forEach((d, i) => {
				const index = mergedTimeSeriesData.findIndex((m) => m.date.getTime() === d.date.getTime());
				if (index !== -1) {
					mergedTimeSeriesData[index] = {
						...mergedTimeSeriesData[index],
						...d
					};
				} else {
					mergedTimeSeriesData.push(d);
				}
			});
		}
	});

	// sort the merged time series
	mergedTimeSeriesData.sort((a, b) => a.time - b.time);

	// combine all the time series
	/** @type {*} */
	const projectionTimeSeries = starts.reduce(
		(acc, start) => {
			return {
				data: [],
				seriesNames: [...acc.seriesNames, ...start.timeSeries.seriesNames],
				seriesColours: { ...acc.seriesColours, ...start.timeSeries.seriesColours },
				seriesLabels: { ...acc.seriesLabels, ...start.timeSeries.seriesLabels },
				statsType: 'projection',
				maxY: 0,
				minY: 0,
				statsInterval: start.timeSeries.statsInterval
			};
		},
		{ data: [], seriesNames: [], seriesColours: {}, seriesLabels: {} }
	);

	projectionTimeSeries.data = mergedTimeSeriesData;
	/********* end of processing Projection */

	/********* processing Historical */
	const historicalStats = new Statistic(history, 'history', 'GWh')
		.invertValues(loadFuelTechs)
		.group(fuelTechMap[group], loadFuelTechs)
		.reorder(orderMap[group] || []);

	const netGenerationStats = deepCopy(historicalStats.data[0]);
	netGenerationStats.id = `historical`;
	netGenerationStats.code = null;
	netGenerationStats.fuel_tech = null;
	netGenerationStats.label = 'Historical';
	netGenerationStats.colour = '#000';

	if (includeBatteryAndLoads) {
		const dataLoads = historicalStats.data[0].history.data;
		const dataSources = historicalStats.data[1].history.data;
		const netGenerationData = dataSources.map((d, i) => d + dataLoads[i]); // loads are already negative

		netGenerationStats.history.data = netGenerationData;
	}

	const historicalTimeSeries = new TimeSeries(
		[netGenerationStats],
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
 * projections: {
 * 	id: string,
 * 	model: string,
 * 	scenario: string,
 * 	pathway: string,
 * 	projectionEnergyData: StatsData[],
 * 	projectionCapacityData: StatsData[],
 * 	projectionEmissionsData: StatsData[]
 * }[], history:  StatsData[], includeBatteryAndLoads: boolean}} param0
 * @returns
 */
function capacity({ projections, history, includeBatteryAndLoads }) {
	const group = includeBatteryAndLoads ? 'sources_loads' : 'sources_without_battery';

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
		// TODO: update this to be more reliable
		const index = includeBatteryAndLoads ? 1 : 0;
		const capacityStats = projection.stats.data[index]
			? deepCopy(projection.stats.data[index])
			: deepCopy(projection.stats.data[0]);

		if (capacityStats) {
			capacityStats.id = `${projection.id}`;
			capacityStats.code = null;
			capacityStats.fuel_tech = null;
			capacityStats.label = scenarioLabels[projection.model][projection.scenario];
			capacityStats.colour = scenarioColourMap[`${projection.model}-${projection.scenario}`];

			scenarioProjectionStats.push(capacityStats);
		}
	});

	const projectionTimeSeries = new TimeSeries(
		scenarioProjectionStats,
		parseInterval('1Y'),
		'projection',
		undefined,
		undefined
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

	const netCapacityStats = deepCopy(historicalStats.data[0]);
	netCapacityStats.id = `historical`;
	netCapacityStats.code = null;
	netCapacityStats.fuel_tech = null;
	netCapacityStats.label = 'Historical';
	netCapacityStats.colour = '#000';

	if (includeBatteryAndLoads) {
		const totalSources = historicalStats.data.find((d) => d.fuel_tech === 'total_sources');
		const totalLoads = historicalStats.data.find((d) => d.fuel_tech === 'total_loads');
		const dataLoads = totalLoads ? totalLoads.history.data : [];
		const dataSources = totalSources.history.data;
		const netCapacityData = dataSources.map((d, i) => d + dataLoads[i]); // loads are already negative

		netCapacityStats.history.data = netCapacityData;
	}

	const historicalTimeSeries = new TimeSeries(
		[netCapacityStats],
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

	// console.log('capacity historicalStats', historicalStats);
	// console.log('capacity historicalTimeSeries', historicalTimeSeries);

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
 * projections: {
 * 	id: string,
 * 	model: string,
 * 	scenario: string,
 * 	pathway: string,
 * 	projectionEnergyData: StatsData[],
 * 	projectionCapacityData: StatsData[],
 * 	projectionEmissionsData: StatsData[]
 * }[], history:  StatsData[], includeBatteryAndLoads: boolean}} param0
 * @returns
 */
function emissions({ projections, history, includeBatteryAndLoads }) {
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
		const emissionStats = deepCopy(projection.stats.data[0]);

		if (emissionStats) {
			emissionStats.id = `${projection.id}`;
			emissionStats.code = null;
			emissionStats.fuel_tech = null;
			emissionStats.label = scenarioLabels[projection.model][projection.scenario];
			emissionStats.colour = scenarioColourMap[`${projection.model}-${projection.scenario}`];

			scenarioProjectionStats.push(emissionStats);
		}
	});

	const projectionTimeSeries = new TimeSeries(
		scenarioProjectionStats,
		parseInterval('1Y'),
		'projection',
		undefined,
		undefined
	).transform();

	// match FY dates, use start of year as display (i.e. 1 Jan 2024 == FY 2024)
	projectionTimeSeries.data = mutateDatesToStartOfYear(projectionTimeSeries.data, 1);
	/********* end of processing Projection */

	// console.log('emissions projectionsStats', projectionsStats);
	// console.log('emissions projectionTimeSeries', projectionTimeSeries);

	/********* processing Historical */
	const merged = mergeHistoricalEmissionsData(history, includeBatteryAndLoads);
	const historicalStats = new Statistic(merged, 'history', 'tCO2e');
	historicalStats.data[0].id = 'historical';
	historicalStats.data[0].label = 'Historical';
	historicalStats.data[0].colour = '#444444';

	const historicalTimeSeries = new TimeSeries(
		historicalStats.data,
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

	// console.log('emissions history', history);
	// console.log('emissions historicalStats', historicalStats);
	// console.log('emissions netEmissionsStats', netEmissionsStats);
	// console.log('emissions historicalTimeSeries', historicalTimeSeries);

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

	processedIntensity.yDomain = [0, 1200];
	processedIntensity.chartType = 'line';
	processedIntensity.prefix = '';
	processedIntensity.baseUnit = 'kgCO2e/MWh';
	processedIntensity.displayPrefix = '';
	processedIntensity.allowedPrefixes = [];

	return processedIntensity;
}

function getScenarioColours(seriesNames) {
	const scenarioPathways = seriesNames.filter((name) => name !== 'historical');

	const scenarioPathwayDetails = scenarioPathways.map((name) => {
		const [model, scenario, pathway] = name.split('-');
		return {
			model,
			scenario,
			pathway
		};
	});

	const scenarioColourCounter = scenarioPathwayDetails.reduce(
		(acc, { model, scenario, pathway }) => {
			const key = `${model}-${scenario}`;
			if (acc[key]) {
				acc[key].push(`${model}-${scenario}-${pathway}`);
			} else {
				acc[key] = [`${model}-${scenario}-${pathway}`];
			}
			return acc;
		},
		{}
	);

	let newColours = {
		historical: '#000'
	};
	Object.keys(scenarioColourCounter).forEach((key) => {
		const colour = scenarioColourMap[key] || '#000';
		let names = scenarioColourCounter[key];

		names.forEach((name, i) => {
			newColours[name] = color(colour)
				.brighter(i * 0.3)
				.formatHex();
		});
	});

	return newColours;
}

export default {
	generation,
	capacity,
	emissions,
	intensity,
	getScenarioColours
};
