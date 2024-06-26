import { startOfYear, format, addYears } from 'date-fns';
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
	totalsGroup,
	totalSourcesGroup
} from './groups';
import { regionsOnly, regionsOnlyWithColours, regionsOnlyWithLabels } from './options';
import { scenarioLabels } from './descriptions';

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

// totalSourcesGroup is used for calculating percentages
const allGroupOptions = [
	...dataTechnologyGroupOptions,
	...dataRegionCompareOptions,
	totalSourcesGroup
];

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

export function calculatePercentageStats(statsData, otherStats, type) {
	const sourceLoadStats = createNewStats(statsData.data, 'totals', type);

	let netData = [];

	sourceLoadStats.data.forEach((d, i) => {
		if (i === 0) {
			netData = d[type].data.map((v) => v);
		} else {
			d[type].data.forEach((v, j) => {
				netData[j] += v;
			});
		}
	});

	otherStats.data.forEach((s) => {
		s.units = '%';
		s[type].data.forEach((d, i) => {
			s[type].data[i] = (d / netData[i]) * 100;
		});
	});

	return otherStats;
}

export function calculatePercentageTimeSeries(dataset, otherTimeSeries, colourReducer, type) {
	const sourceLoadStats = createNewStats(dataset, 'totals', type);
	const totalsLoadIds = dataset.filter((d) => d.isLoad).map((d) => d.id);

	let netStatsData = {};
	let netData = [];

	sourceLoadStats.data.forEach((d, i) => {
		if (i === 0) {
			netData = d[type].data.map((v) => v);
			netStatsData = {
				...d,
				[type]: {
					...d[type],
					data: netData
				},
				id: 'au.net_total',
				code: 'net_total',
				fuel_tech: 'net_total',
				isLoad: false
			};
		} else {
			d[type].data.forEach((v, j) => {
				netData[j] += v;
			});
		}
	});

	netStatsData[type].data = netData;

	const netTimeSeries = createNewTimeSeries(
		[netStatsData],
		colourReducer,
		totalsLoadIds,
		type,
		'1M',
		'FY'
	);

	const otherSeriesName = otherTimeSeries.seriesNames[0];
	otherTimeSeries.data.forEach((s, i) => {
		s[otherSeriesName] = (s[otherSeriesName] / netTimeSeries.data[i]['au.net_total']) * 100;
	});

	return otherTimeSeries;
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
 * @param {{
 * 	historicalTimeSeries: TimeSeries,
 * 	projectionTimeSeries: TimeSeries,
 * 	selectedDataView: string
 * }} param0
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
 * Process data for Scenario data view
 * @param {{
 * 	scenarioProjectionData: *,
 * 	scenarioProjectionTimeSeries: { id: string, model: string, scenario: string, pathway: string, series: TimeSeries}[],
 * 	scenarioHistoricalTimeSeries: {model: string, scenario: string, pathway: string, series: TimeSeries}[],
 * 	selectedDataView: string,
 * 	historySeriesName: string
 * }} param0
 */
export function processScenarioData({
	scenarioProjectionData,
	scenarioProjectionTimeSeries,
	scenarioHistoricalTimeSeries,
	selectedDataView,
	historySeriesName
}) {
	let updatedData = [];
	let combinedScenarioData = [];

	// Mutate historical dates (update june to jan) to match ISP and filter from 2010 and before 2025
	const filteredHistoricalTimeSeries = mutateHistoryDataDates(
		scenarioHistoricalTimeSeries.data
	).filter((d) => d.date.getFullYear() < 2025 && d.date.getFullYear() > 2009);

	if (scenarioProjectionTimeSeries.length > 0) {
		const lastHistory = filteredHistoricalTimeSeries[filteredHistoricalTimeSeries.length - 1];
		const firstProjectionSeriesData = scenarioProjectionTimeSeries[0].series.data;
		const firstProjectionItem = firstProjectionSeriesData[0];

		console.log(
			'processing',
			filteredHistoricalTimeSeries,
			scenarioProjectionTimeSeries,
			selectedDataView
		);

		if (lastHistory?.time && firstProjectionItem?.time) {
			// if last history time is the same as first projection time, remove the last history data
			const historyData =
				lastHistory?.time === firstProjectionItem?.time
					? filteredHistoricalTimeSeries.slice(0, -1)
					: filteredHistoricalTimeSeries;

			// console.log('first last', firstProjectionItem, lastHistory, historyData);

			// add all date/time and historical net values to updatedData
			updatedData = [...historyData, ...firstProjectionSeriesData].map((d, i) => {
				const historical = i < historyData.length ? d[historySeriesName] : null;
				return {
					historical,
					date: d.date,
					time: d.time
				};
			});

			// add one more year if it doesn't finishes in 2052
			const lastDate = updatedData[updatedData.length - 1].date;
			if (lastDate.getFullYear() !== 2052) {
				const newYear = addYears(lastDate, 1);
				updatedData.push({
					historical: null,
					date: newYear,
					time: newYear.getTime()
				});
			}

			// add all scenario projection data to updatedData
			// - add based on the date time because different models will have different projection start/end dates
			scenarioProjectionTimeSeries.forEach((series) => {
				series.series.data.forEach((d, i) => {
					const find = updatedData.find((u) => u.time === d.time);
					find[series.id] = d._max; // demand (sources - loads)
				});
			});

			// add empty values for scenario projection data before first projection date
			updatedData.forEach((d) => {
				scenarioProjectionTimeSeries.forEach((series) => {
					if (!d[series.id]) {
						d[series.id] = null;
					}
				});
			});

			// combine historical and projection data, adding empty values for historical data for Capacity data view
			// let data =
			// 	selectedDataView === 'energy'
			// 		? [...historyData, ...scenarioProjectionTimeSeries.data]
			// 		: [...getEmpty(historyData), ...scenarioProjectionTimeSeries.data];
		}
	}

	const names = [...scenarioProjectionTimeSeries.map((d) => d.id), 'historical'];
	const options = names.map((name) => {
		return { id: name, name: name, colour: name === 'historical' ? 'red' : 'black' };
	});

	const colours = scenarioProjectionData.reduce(
		(acc, curr) => ((acc[curr.id] = curr.colour), acc),
		{}
	);
	colours['historical'] = 'black';
	const labels = scenarioProjectionTimeSeries.reduce(
		(acc, curr) => ((acc[curr.id] = scenarioLabels[curr.model][curr.scenario]), acc),
		{}
	);
	// add History
	labels['historical'] = 'Historical';

	return {
		data: updatedData.map((d) => {
			/** @type {TimeSeriesData} */
			const newObj = { ...d };
			// get min and max values for each time series
			newObj._max = 0;
			newObj._min = 0;

			scenarioProjectionTimeSeries.forEach((l) => {
				// @ts-ignore
				if (d[l.id] > newObj._max) {
					newObj._max = d[l.id];
				}
			});

			return newObj;
		}),
		names,
		nameOptions: names.map((name) => {
			return { id: name, name: name };
		}),
		colours: colours,
		labels: labels
	};
}

/**
 * Process data for Region data view
 * @param {{
 * 	regionProjectionTimeSeries: {region: string, series: TimeSeries}[],
 * 	regionHistoricalTimeSeries: {region: string, series: TimeSeries}[],
 * 	selectedDataView: string,
 * 	historySeriesName: string
 * }} param0
 */
export function processRegionData({
	regionProjectionTimeSeries,
	regionHistoricalTimeSeries,
	selectedDataView,
	historySeriesName
}) {
	let updatedData = [];
	let combinedRegionData = [];

	console.log('processRegionData regionHistoricalTimeSeries', regionHistoricalTimeSeries);

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
				updatedData[i][series.region] = d[historySeriesName]; // demand (sources - loads)
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
