import Statistic from '$lib/utils/Statistic';
import TimeSeries from '$lib/utils/TimeSeries';
import parseInterval from '$lib/utils/intervals';

import { fuelTechNameReducer, loadFuelTechs } from '$lib/fuel_techs.js';
import { fuelTechMap, orderMap } from './groups-technology';
import excludeBatteryAndLoads from './exclude-battery-and-loads';
import { mutateDatesToStartOfYear, mergeHistoricalEmissionsData } from './utils';

/**
 * @param {StatsData[]} statsData
 * @returns {string[]}
 */
function getLoadIds(statsData) {
	return statsData
		.filter((/** @type {StatsData} */ d) => d.isLoad)
		.map((/** @type {StatsData} */ d) => d.id);
}

/**
 * @param {{
 * historicalTimeSeries: TimeSeries,
 * projectionTimeSeries: TimeSeries,
 * projectionLoadSeries: string[]
 * }} param0
 * @returns {ProcessedDataViz}
 */
function combineHistoryProjection({
	historicalTimeSeries,
	projectionTimeSeries,
	projectionLoadSeries
}) {
	const historicalTimeSeriesData = historicalTimeSeries.data;
	const projectionTimeSeriesData = projectionTimeSeries.data;

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

		const maxY = [...seriesData.map((d) => d._max)];
		// @ts-ignore
		const datasetMax = maxY ? Math.max(...maxY) : 0;

		const minY = [...seriesData.map((d) => d._min)];
		// @ts-ignore
		const datasetMin = minY ? Math.min(...minY) : 0;
		/********* end of processing Combined series */

		return {
			seriesData,
			seriesNames,
			nameOptions: [...seriesNames].reverse().map((name) => {
				return { label: name, value: name };
			}),
			seriesColours,
			seriesLabels,
			seriesLoadsIds: projectionLoadSeries,
			yDomain: [datasetMin, datasetMax]
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
 * @param {{
 * projection: StatsData[],
 * history: StatsData[],
 * group: string,
 * colourReducer: *
 * includeBatteryAndLoads: boolean
 * }} param0
 * @returns {ProcessedDataViz}
 */
function generation({ projection, history, group, colourReducer, includeBatteryAndLoads }) {
	const fuelTechs = includeBatteryAndLoads
		? fuelTechMap[group]
		: excludeBatteryAndLoads(fuelTechMap[group]);

	/********* processing Projection */
	const projectionStats = new Statistic(projection, 'projection', 'GWh')
		.invertValues(loadFuelTechs)
		.group(fuelTechs, loadFuelTechs)
		.reorder(orderMap[group] || []);

	const projectionLoadSeries = getLoadIds(projectionStats.data);
	const projectionTimeSeries = new TimeSeries(
		projectionStats.data,
		parseInterval('1Y'),
		'projection',
		fuelTechNameReducer,
		colourReducer
	)
		.transform()
		.updateMinMax(projectionLoadSeries);

	// match FY dates, use start of year as display (i.e. 1 Jan 2024 == FY 2024)
	projectionTimeSeries.data = mutateDatesToStartOfYear(projectionTimeSeries.data, 1);
	/********* end of processing Projection */

	/********* processing Historical */
	const historicalStats = new Statistic(history, 'history', 'GWh')
		.invertValues(loadFuelTechs)
		.group(fuelTechs, loadFuelTechs)
		.reorder(orderMap[group] || []);

	const historicalLoadSeries = getLoadIds(historicalStats.data);

	const historicalTimeSeries = new TimeSeries(
		historicalStats.data,
		parseInterval('1M'),
		'history',
		fuelTechNameReducer,
		colourReducer
	)
		.transform()
		.rollup(parseInterval('FY'))
		.updateMinMax(historicalLoadSeries);

	// match FY dates, use start of year as display (i.e. 1 Jan 2024 == FY 2024) and filter out years outside of 2010-2024
	historicalTimeSeries.data = mutateDatesToStartOfYear(historicalTimeSeries.data).filter(
		(d) => d.date.getFullYear() < 2025 && d.date.getFullYear() > 2009
	);
	/********* end of processing History */

	return combineHistoryProjection({
		historicalTimeSeries,
		projectionTimeSeries,
		projectionLoadSeries
	});
}

/**
 * @param {{
 * projection: StatsData[],
 * history: StatsData[],
 * group: string,
 * colourReducer: *
 * includeBatteryAndLoads: boolean
 * }} param0
 * @returns {ProcessedDataViz}
 */
function capacity({ projection, history, group, colourReducer, includeBatteryAndLoads }) {
	const fuelTechs = includeBatteryAndLoads
		? fuelTechMap[group]
		: excludeBatteryAndLoads(fuelTechMap[group]);

	/********* processing Projection */
	const projectionStats = new Statistic(projection, 'projection', 'MW')
		.invertValues(loadFuelTechs)
		.group(fuelTechs, loadFuelTechs)
		.reorder(orderMap[group] || []);

	const projectionLoadSeries = getLoadIds(projectionStats.data);

	const projectionTimeSeries = new TimeSeries(
		projectionStats.data,
		parseInterval('1Y'),
		'projection',
		fuelTechNameReducer,
		colourReducer
	)
		.transform()
		.updateMinMax(projectionLoadSeries);

	// match FY dates, use start of year as display (i.e. 1 Jan 2024 == FY 2024)
	projectionTimeSeries.data = mutateDatesToStartOfYear(projectionTimeSeries.data, 1);
	/********* end of processing Projection */

	/********* processing Historical */
	const historicalStats = new Statistic(history, 'history', 'MW')
		.invertValues(loadFuelTechs)
		.group(fuelTechs, loadFuelTechs)
		.reorder(orderMap[group] || []);

	const historicalLoadSeries = getLoadIds(historicalStats.data);

	// Capacity is already in FY
	const historicalTimeSeries = new TimeSeries(
		historicalStats.data,
		parseInterval('1Y'),
		'history',
		fuelTechNameReducer,
		colourReducer
	)
		.transform()
		.updateMinMax(historicalLoadSeries);

	// Capacity is already in FY
	// match FY dates, use start of year as display (i.e. 1 Jan 2024 == FY 2024) and filter out years outside of 2010-2024
	historicalTimeSeries.data = mutateDatesToStartOfYear(historicalTimeSeries.data, 1).filter(
		(d) => d.date.getFullYear() < 2025 && d.date.getFullYear() > 2009
	);
	/********* end of processing History */

	return combineHistoryProjection({
		historicalTimeSeries,
		projectionTimeSeries,
		projectionLoadSeries
	});
}

/**
    when viewing generation:
    sum(all emissions from visible sources except imports) / energy from all of the above

    when viewing consumption:
    sum(all emissions from visible sources) minus exports / energy from all of the above
 */
/**
 *
 * @param {{
 * projection: StatsData[],
 * history: StatsData[],
 * includeBatteryAndLoads: boolean
 * }} param0
 * @returns {ProcessedDataViz}
 */
function emissions({ projection, history, includeBatteryAndLoads }) {
	console.log('technology emissions', projection, history);
	// mutate projection id
	projection.forEach((d) => {
		d.id = 'au.emissions.total';
	});
	const projectionStats = new Statistic(projection, 'projection', 'tCO2e');

	const merged = mergeHistoricalEmissionsData(history, includeBatteryAndLoads);
	const historicalStats = new Statistic(merged, 'history', 'tCO2e');

	const projectionTimeSeries = new TimeSeries(
		projectionStats.data,
		parseInterval('1Y'),
		'projection',
		undefined,
		undefined
	)
		.transform()
		.updateMinMax();
	// match FY dates, use start of year as display (i.e. 1 Jan 2024 == FY 2024)
	projectionTimeSeries.data = mutateDatesToStartOfYear(projectionTimeSeries.data, 1);

	const historicalTimeSeries = new TimeSeries(
		historicalStats.data,
		parseInterval('1M'),
		'history',
		undefined,
		undefined
	)
		.transform()
		.rollup(parseInterval('FY'))
		.updateMinMax();

	historicalTimeSeries.data = mutateDatesToStartOfYear(historicalTimeSeries.data).filter(
		(d) => d.date.getFullYear() < 2025 && d.date.getFullYear() > 2009
	);

	return {
		...combineHistoryProjection({
			historicalTimeSeries,
			projectionTimeSeries,
			projectionLoadSeries: []
		}),
		seriesLabels: { 'au.emissions.total': 'Emissions Volume' },
		nameOptions: [{ label: 'Emissions Volume', value: 'au.emissions.total' }]
	};
}

/**
 *
 * @param {{processedEmissions: ProcessedDataViz, processedEnergy: ProcessedDataViz}} param0
 * @returns {ProcessedDataViz}
 */
function intensity({ processedEmissions, processedEnergy }) {
	// calculate intensity
	// use net generaiton (_max) for intensity -
	// TODO: recalculate total generation - check opennem to see what fuel tech to include..
	const emissionsTotalData = processedEmissions.seriesData;
	const generationsNetTotalData = processedEnergy.seriesData.map((d) => {
		return {
			time: d.time,
			date: d.date,
			'au.net_generation.total': d._max
		};
	});
	const intensityData = emissionsTotalData.map((d, i) => {
		return {
			time: d.time,
			date: d.date,
			'au.emission_intensity':
				d['au.emissions.total'] / generationsNetTotalData[i]['au.net_generation.total']
		};
	});

	// console.log('emissionsTotalData', emissionsTotalData);
	// console.log('generationsNetTotalData', generationsNetTotalData);
	// console.log('intensityData', intensityData, processedEmissions);

	return {
		seriesData: intensityData,
		seriesNames: ['au.emission_intensity'],
		seriesColours: { 'au.emission_intensity': '#000' },
		seriesLabels: { 'au.emission_intensity': 'Emission Intensity' },
		nameOptions: [{ label: 'Emission Intensity', value: 'au.emission_intensity' }],
		yDomain: [0, 1500],
		chartType: 'line'
	};
}

export default {
	generation,
	capacity,
	emissions,
	intensity
};
