import { startOfYear, format } from 'date-fns';
import { format as d3Format } from 'd3-format';

import { fuelTechNameReducer, loadFuelTechs } from '$lib/fuel_techs.js';
import deepCopy from '$lib/utils/deep-copy';

import Statistic from '$lib/utils/Statistic';
import TimeSeries from '$lib/utils/TimeSeries';
import parseInterval from '$lib/utils/intervals';
import {
	detailedGroup,
	simpleGroup,
	renewablesVsFossilsGroup,
	coalGasGroup,
	windSolarGroup,
	totalsGroup
} from './groups';
import { regionsOnly, regionsOnlyWithColours, regionsOnlyWithLabels } from './options';

export const formatTickY = (/** @type {number} */ d) => d3Format('~s')(d);
export const formatFyTickX = (/** @type {Date | number} */ d) => {
	return format(d, 'yyyy');
};
export const displayXTicks = (d) => d.map((t) => startOfYear(t));
export const formatValue = (/** @type {number} */ d) => {
	if (isNaN(d)) return '—';

	const formatted = d3Format('.0f')(d);
	if (formatted !== '0') {
		return formatted;
	}
	return formatted;
};

export const dataTechnologyGroupOptions = [simpleGroup, detailedGroup, renewablesVsFossilsGroup];
export const dataRegionCompareOptions = [totalsGroup, coalGasGroup, windSolarGroup];
const allGroupOptions = [...dataTechnologyGroupOptions, ...dataRegionCompareOptions];

/**
 *
 * @param {*} data
 * @param {*} selectedGroup
 * @param {StatsType} type
 * @returns
 */
export function createNewStats(data, selectedGroup, type = 'projection') {
	const group = allGroupOptions.find((d) => d.value === selectedGroup);

	if (!group) console.error('Group not found');

	return new Statistic(data, type)
		.invertValues(loadFuelTechs)
		.group(group?.fuelTechs, loadFuelTechs)
		.reorder(group?.order || []);
}

/**
 *
 * @param {*} statsData
 * @param {*} colourReducer
 * @param {*} loadSeries
 * @param {StatsType} type
 * @param {string} interval
 * @param {string} rollupInterval
 * @returns
 */
export function createNewTimeSeries(
	statsData,
	colourReducer,
	loadSeries = [],
	type = 'projection',
	interval = '1Y',
	rollupInterval
) {
	const ts = new TimeSeries(
		statsData,
		parseInterval(interval),
		type,
		fuelTechNameReducer,
		colourReducer
	);
	return rollupInterval
		? ts.transform().rollup(parseInterval(rollupInterval)).updateMinMax(loadSeries)
		: ts.transform().updateMinMax(loadSeries);
}

// Convert historical data to Terra to match ISP
export function covertHistoryDataToTWh(data) {
	return data.map((/** @type {StatsData} */ d) => {
		const historyData = d.history.data.map((v) => (v ? v / 1000 : null));
		d.history = { ...d.history, data: historyData };
		d.units = 'TWh';
		return d;
	});
}
// Mutate history data dates to match ISP FY format
export function mutateHistoryDataDates(data) {
	return data.map((d) => {
		const date = startOfYear(d.date);
		return { ...d, date, time: date.getTime() };
	});
}

// return empty values for these dates
// - only for Capacity view because we don't have historical capacity data
// - to pad out the xAxis
const getEmpty = (data) =>
	deepCopy(data).map((d) => {
		Object.keys(d).forEach((key) => {
			if (key !== 'date' && key !== 'time') {
				d[key] = 0;
			}
		});
		return { ...d, date: new Date(d.time) };
	});

/**
 * Process data for Technology data view
 * @param {{ historicalTimeSeries: TimeSeries, projectionTimeSeries: TimeSeries, selectedDataView: string }} param0
 */
export function processTechnologyData({
	historicalTimeSeries,
	projectionTimeSeries,
	selectedDataView
}) {
	// Mutate historical dates (update june to jan) to match ISP and filter from 2010 and before 2025
	const filteredHistoricalTimeSeries = mutateHistoryDataDates(historicalTimeSeries.data).filter(
		(d) => d.date.getFullYear() < 2025 && d.date.getFullYear() > 2009
	);

	const lastHistory = filteredHistoricalTimeSeries[filteredHistoricalTimeSeries.length - 1];
	const firstProjection = projectionTimeSeries.data[0];

	if (lastHistory?.time && firstProjection?.time) {
		// if last history time is the same as first projection time, remove the last history data
		const historyData =
			lastHistory?.time === firstProjection?.time
				? filteredHistoricalTimeSeries.slice(0, -1)
				: filteredHistoricalTimeSeries;

		// combine historical and projection data, adding empty values for historical data for Capacity data view
		let data =
			selectedDataView === 'energy'
				? [...historyData, ...projectionTimeSeries.data]
				: [...getEmpty(historyData), ...projectionTimeSeries.data];

		// combine projection and historical series names to make sure they are all included in the time series
		let names = [
			...new Set([...projectionTimeSeries.seriesNames, ...historicalTimeSeries.seriesNames])
		];

		/** @type {*} */
		let colours = {};
		/** @type {*} */
		let labels = {};

		names.forEach((name) => {
			colours[name] =
				historicalTimeSeries.seriesColours[name] || projectionTimeSeries.seriesColours[name];

			labels[name] =
				historicalTimeSeries.seriesLabels[name] || projectionTimeSeries.seriesLabels[name];
		});

		return {
			data,
			names,
			nameOptions: [...names].reverse().map((name) => {
				return { id: name, name: name };
			}),
			colours,
			labels
		};
	}

	return false;
}

/**
 * Process data for Technology data view
 * @param {{ regionProjectionTimeSeries: {region: string, series: TimeSeries}[], regionHistoricalTimeSeries: {region: string, series: TimeSeries}[], selectedDataView: string }} param0
 */

export function processRegionData({
	regionProjectionTimeSeries,
	regionHistoricalTimeSeries,
	selectedDataView
}) {
	let updatedData = [];
	let combinedRegionData = [];

	if (regionProjectionTimeSeries.length > 0 && regionHistoricalTimeSeries.length > 0) {
		regionHistoricalTimeSeries.forEach((series) => {
			series.series.data = mutateHistoryDataDates(series.series.data).filter(
				(d) => d.date.getFullYear() < 2025 && d.date.getFullYear() > 2009
			);
		});

		const firstHistoricalSeriesData = regionHistoricalTimeSeries[0].series.data;
		const lastHistoryItem = firstHistoricalSeriesData[firstHistoricalSeriesData.length - 1];
		const firstProjectionSeriesData = regionProjectionTimeSeries[0].series.data;
		const firstProjectionItem = firstProjectionSeriesData[0];

		regionsOnly.forEach((region) => {
			const historicalData = regionHistoricalTimeSeries.find((d) => d.region === region);
			const projectionData = regionProjectionTimeSeries.find((d) => d.region === region);

			if (historicalData && projectionData) {
				// if last history time is the same as first projection time, remove the last history data
				const historyData =
					lastHistoryItem?.time === firstProjectionItem?.time
						? historicalData.series.data.slice(0, -1)
						: historicalData.series.data;

				// combine historical and projection data, adding empty values for historical data for Capacity data view
				let data =
					selectedDataView === 'energy'
						? [...historyData, ...projectionData.series.data]
						: [...getEmpty(historyData), ...projectionData.series.data];

				combinedRegionData.push({
					region: region,
					data: data
				});
			}
		});

		console.log('combinedRegionData', combinedRegionData);

		updatedData = combinedRegionData[0].data.map((d) => {
			return {
				date: d.date,
				time: d.time
			};
		});

		combinedRegionData.forEach((series) => {
			series.data.forEach((d, i) => {
				updatedData[i][series.region] = d._max; // demand (sources - loads)
			});
		});
	}

	return {
		data: updatedData.map((d) => {
			/** @type {TimeSeriesData} */
			const newObj = { ...d };
			// get min and max values for each time series
			newObj._max = 0;
			newObj._min = 0;

			regionsOnly.forEach((l) => {
				// @ts-ignore
				if (d[l] > newObj._max) {
					newObj._max = d[l];
				}
			});

			return newObj;
		}),
		names: regionsOnly,
		nameOptions: [...regionsOnly].map((name) => {
			return { id: name, name: name };
		}),
		colours: regionsOnlyWithColours,
		labels: regionsOnlyWithLabels
	};
}
