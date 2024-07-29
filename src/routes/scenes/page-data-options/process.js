import Statistic from '$lib/utils/Statistic';
import TimeSeries from '$lib/utils/TimeSeries';
import parseInterval from '$lib/utils/intervals';

import { fuelTechNameReducer, loadFuelTechs } from '$lib/fuel_techs.js';
import { fuelTechMap, orderMap } from './groups';
import { mutateDatesToStartOfYear, mergeHistoricalEmissionsData } from './utils';

/**
 * @param {{
 * projection: StatsData[],
 * history: StatsData[],
 * group: string,
 * dataType: ScenarioDataType,
 * colourReducer: *}} param0
 */
export function processTechnologyData({ projection, history, group, dataType, colourReducer }) {
	/********* processing Projection */
	const projectionStats = new Statistic(projection, 'projection')
		.invertValues(loadFuelTechs)
		.group(fuelTechMap[group], loadFuelTechs)
		.reorder(orderMap[group] || []);

	const projectionLoadSeries = projectionStats.data
		.filter((/** @type {*} */ d) => d.isLoad)
		.map((d) => d.id);
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
	const updatedProjectionTS = mutateDatesToStartOfYear(projectionTimeSeries.data, 1);
	/********* end of processing Projection */

	/********* processing Historical */
	const historicalStats = new Statistic(history, 'history')
		.invertValues(loadFuelTechs)
		.group(fuelTechMap[group], loadFuelTechs)
		.reorder(orderMap[group] || []);

	const historicalLoadSeries = historicalStats.data
		.filter((/** @type {*} */ d) => d.isLoad)
		.map((d) => d.id);

	// Capacity is already in FY
	const historicalTimeSeries =
		dataType === 'capacity'
			? new TimeSeries(
					historicalStats.data,
					parseInterval('1Y'),
					'history',
					fuelTechNameReducer,
					colourReducer
			  )
					.transform()
					.updateMinMax(historicalLoadSeries)
			: new TimeSeries(
					historicalStats.data,
					parseInterval('1M'),
					'history',
					fuelTechNameReducer,
					colourReducer
			  )
					.transform()
					.rollup(parseInterval('FY'))
					.updateMinMax(historicalLoadSeries);

	// Capacity is already in FY
	// match FY dates, use start of year as display (i.e. 1 Jan 2024 == FY 2024) and filter out years outside of 2010-2024
	const updatedHistoricalTS =
		dataType === 'capacity'
			? mutateDatesToStartOfYear(historicalTimeSeries.data, 1).filter(
					(d) => d.date.getFullYear() < 2025 && d.date.getFullYear() > 2009
			  )
			: mutateDatesToStartOfYear(historicalTimeSeries.data).filter(
					(d) => d.date.getFullYear() < 2025 && d.date.getFullYear() > 2009
			  );
	/********* end of processing History */

	console.log('projectionTimeSeries.data', projectionTimeSeries.data);
	console.log('historicalTimeSeries.data', historicalTimeSeries.data);

	console.log('updatedProjectionTS', updatedProjectionTS);
	console.log('updatedHistoricalTS', updatedHistoricalTS);

	/********* processing Combined series */
	const lastHistory = updatedHistoricalTS[updatedHistoricalTS.length - 1];
	const firstProjection = updatedProjectionTS[0];

	if (lastHistory?.time && firstProjection?.time) {
		// if last history time is the same as first projection time, remove the last history data
		const historyData =
			lastHistory?.time === firstProjection?.time
				? updatedHistoricalTS.slice(0, -1)
				: updatedHistoricalTS;

		// combine historical and projection data
		const seriesData = [...historyData, ...updatedProjectionTS];

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
 * history: StatsData[]}} param0
 */
export function processEmissionsData({ projection, history }) {
	// mutate projection id
	projection.forEach((d) => {
		d.id = 'au.emissions.total';
	});
	const projectionStats = new Statistic(projection, 'projection');

	const merged = mergeHistoricalEmissionsData(history);
	const historicalStats = new Statistic(merged, 'history');

	console.log('projectionStats', projectionStats);
	console.log('historicalStats', historicalStats);

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
	const updatedProjectionTS = mutateDatesToStartOfYear(projectionTimeSeries.data, 1);

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

	const updatedHistoricalTS = mutateDatesToStartOfYear(historicalTimeSeries.data).filter(
		(d) => d.date.getFullYear() < 2025 && d.date.getFullYear() > 2009
	);
	console.log('updatedProjectionTS', updatedProjectionTS);
	console.log('updatedHistoricalTS', updatedHistoricalTS);

	/********* processing Combined series */
	const lastHistory = updatedHistoricalTS[updatedHistoricalTS.length - 1];
	const firstProjection = updatedProjectionTS[0];

	if (lastHistory?.time && firstProjection?.time) {
		// if last history time is the same as first projection time, remove the last history data
		const historyData =
			lastHistory?.time === firstProjection?.time
				? updatedHistoricalTS.slice(0, -1)
				: updatedHistoricalTS;

		// combine historical and projection data
		const seriesData = [...historyData, ...updatedProjectionTS];

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
			yDomain: [datasetMin, datasetMax]
		};
	}

	return {
		seriesData: updatedHistoricalTS,
		seriesNames: historicalTimeSeries.seriesNames,
		seriesColours: historicalTimeSeries.seriesColours, // custom colour
		seriesLabels: historicalTimeSeries.seriesLabels, // custom label
		nameOptions: [...historicalTimeSeries.seriesNames].map((name) => {
			return { label: name, value: name };
		}),
		yDomain: [historicalTimeSeries.minY, historicalTimeSeries.maxY]
	};
}
