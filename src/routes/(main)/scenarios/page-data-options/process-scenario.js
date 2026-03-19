import { color } from 'd3-color';
import TimeSeries from '$lib/utils/TimeSeries';
import parseInterval from '$lib/utils/intervals';
import { loadFuelTechs } from '$lib/fuel_techs.js';

import { fuelTechMap } from './groups-scenario';
import { scenarioLabels } from './descriptions';
import { scenarioColourMap } from './models';
import sumFuelTechData from './sum-fuel-tech-data';
import combineHistoryProjection from './combine-history-projection';
import { mutateDatesToStartOfYear, mergeHistoricalEmissionsData } from './utils';

/**
 * @param {{
 * projections: {
 * 	id: string,
 * 	model: string,
 * 	scenario: string,
 * 	pathway: string,
 * 	projectionEnergyData: StatsData[],
 * 	projectionCapacityData: StatsData[],
 * 	projectionEmissionsData: StatsData[]
 * }[], history: StatsData[], includeBatteryAndLoads: boolean}} param0
 * @returns
 */
function generation({ projections, history, includeBatteryAndLoads }) {
	const group = includeBatteryAndLoads ? 'sources_loads' : 'sources_without_battery';
	const groupMap = fuelTechMap[group];

	/********* processing Projection */
	/** @type {StatsData[]} */
	const scenarioProjectionStats = [];

	projections.forEach((projection) => {
		const netStats = sumFuelTechData(projection.projectionEnergyData, 'projection', groupMap, {
			negateFuelTechs: loadFuelTechs,
			id: projection.id,
			label: scenarioLabels[projection.model][projection.scenario],
			colour: scenarioColourMap[`${projection.model}-${projection.scenario}`]
		});
		if (netStats) scenarioProjectionStats.push(netStats);
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
			start.timeSeries.data.forEach((d) => {
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

	mergedTimeSeriesData.sort((a, b) => a.time - b.time);

	/** @type {*} */
	const projectionTimeSeries = starts.reduce(
		(/** @type {any} */ acc, start) => {
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
	const historicalNetStats = sumFuelTechData(history, 'history', groupMap, {
		negateFuelTechs: loadFuelTechs,
		id: 'historical',
		label: 'Historical',
		colour: '#000'
	});

	const historicalTimeSeries = new TimeSeries(
		historicalNetStats ? [historicalNetStats] : [],
		parseInterval('1M'),
		'history',
		undefined,
		undefined
	)
		.transform()
		.rollup(parseInterval('FY'));

	historicalTimeSeries.data = mutateDatesToStartOfYear(historicalTimeSeries.data).filter(
		(d) => d.date.getFullYear() < 2025 && d.date.getFullYear() > 2009
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
 * projections: {
 * 	id: string,
 * 	model: string,
 * 	scenario: string,
 * 	pathway: string,
 * 	projectionEnergyData: StatsData[],
 * 	projectionCapacityData: StatsData[],
 * 	projectionEmissionsData: StatsData[]
 * }[], history: StatsData[], includeBatteryAndLoads: boolean}} param0
 * @returns
 */
function capacity({ projections, history, includeBatteryAndLoads }) {
	const group = includeBatteryAndLoads ? 'sources_loads' : 'sources_without_battery';
	const groupMap = fuelTechMap[group];

	/********* processing Projection */
	/** @type {StatsData[]} */
	const scenarioProjectionStats = [];

	projections.forEach((projection) => {
		// For capacity, only include sources (exclude loads group)
		const stats = sumFuelTechData(projection.projectionCapacityData, 'projection', groupMap, {
			excludeGroups: ['total_loads'],
			id: projection.id,
			label: scenarioLabels[projection.model][projection.scenario],
			colour: scenarioColourMap[`${projection.model}-${projection.scenario}`]
		});
		if (stats) scenarioProjectionStats.push(stats);
	});

	const projectionTimeSeries = new TimeSeries(
		scenarioProjectionStats,
		parseInterval('1Y'),
		'projection',
		undefined,
		undefined
	).transform();

	projectionTimeSeries.data = mutateDatesToStartOfYear(projectionTimeSeries.data, 1);
	/********* end of processing Projection */

	/********* processing Historical */
	const historicalNetStats = sumFuelTechData(history, 'history', groupMap, {
		excludeGroups: ['total_loads'],
		id: 'historical',
		label: 'Historical',
		colour: '#000'
	});

	const historicalTimeSeries = new TimeSeries(
		historicalNetStats ? [historicalNetStats] : [],
		parseInterval('1Y'),
		'history',
		undefined,
		undefined
	).transform();

	historicalTimeSeries.data = mutateDatesToStartOfYear(historicalTimeSeries.data).filter(
		(d) => d.date.getFullYear() < 2025 && d.date.getFullYear() > 2009
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
 * projections: {
 * 	id: string,
 * 	model: string,
 * 	scenario: string,
 * 	pathway: string,
 * 	projectionEnergyData: StatsData[],
 * 	projectionCapacityData: StatsData[],
 * 	projectionEmissionsData: StatsData[]
 * }[], history: StatsData[], includeBatteryAndLoads: boolean}} param0
 * @returns
 */
function emissions({ projections, history, includeBatteryAndLoads }) {
	/********* processing Projection */
	/** @type {StatsData[]} */
	const scenarioProjectionStats = [];

	projections.forEach((projection) => {
		if (projection.projectionEmissionsData.length) {
			const first = projection.projectionEmissionsData[0];
			scenarioProjectionStats.push({
				...first,
				id: projection.id,
				code: null,
				fuel_tech: null,
				label: scenarioLabels[projection.model][projection.scenario],
				colour: scenarioColourMap[`${projection.model}-${projection.scenario}`]
			});
		}
	});

	const projectionTimeSeries = new TimeSeries(
		scenarioProjectionStats,
		parseInterval('1Y'),
		'projection',
		undefined,
		undefined
	).transform();

	projectionTimeSeries.data = mutateDatesToStartOfYear(projectionTimeSeries.data, 1);
	/********* end of processing Projection */

	/********* processing Historical */
	const merged = mergeHistoricalEmissionsData(history, includeBatteryAndLoads);
	merged[0].id = 'historical';
	merged[0].label = 'Historical';
	merged[0].colour = '#444444';

	const historicalTimeSeries = new TimeSeries(
		merged,
		parseInterval('1M'),
		'history',
		undefined,
		undefined
	)
		.transform()
		.rollup(parseInterval('FY'));

	historicalTimeSeries.data = mutateDatesToStartOfYear(historicalTimeSeries.data).filter(
		(d) => d.date.getFullYear() < 2025 && d.date.getFullYear() > 2009
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

	const seriesData = processedEmissions.seriesData.map((d, i) => {
		/** @type {TimeSeriesData} */
		const obj = /** @type {any} */ ({
			date: d.date,
			time: d.time
		});

		seriesNames.forEach((/** @type {string} */ name) => {
			/** @type {Record<string, any>} */
			const dRecord = d;
			/** @type {Record<string, any>} */
			const energyRecord = processedEnergy.seriesData[i];
			if (dRecord[name] && energyRecord[name]) {
				/** @type {Record<string, any>} */ (obj)[name] = dRecord[name] / energyRecord[name];
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

/**
 * @param {string[]} seriesNames
 * @returns {Record<string, string>}
 */
function getScenarioColours(seriesNames) {
	const scenarioPathways = seriesNames.filter((/** @type {string} */ name) => name !== 'historical');

	const scenarioPathwayDetails = scenarioPathways.map((/** @type {string} */ name) => {
		const [model, scenario, pathway] = name.split('-');
		return {
			model,
			scenario,
			pathway
		};
	});

	/** @type {Record<string, string[]>} */
	const scenarioColourCounter = scenarioPathwayDetails.reduce(
		(/** @type {Record<string, string[]>} */ acc, { model, scenario, pathway }) => {
			const key = `${model}-${scenario}`;
			if (acc[key]) {
				acc[key].push(`${model}-${scenario}-${pathway}`);
			} else {
				acc[key] = [`${model}-${scenario}-${pathway}`];
			}
			return acc;
		},
		/** @type {Record<string, string[]>} */ ({})
	);

	/** @type {Record<string, string>} */
	let newColours = {
		historical: '#000'
	};
	Object.keys(scenarioColourCounter).forEach((key) => {
		const colour = scenarioColourMap[key] || '#000';
		let names = scenarioColourCounter[key];

		names.forEach((/** @type {string} */ name, /** @type {number} */ i) => {
			const c = /** @type {any} */ (color(colour));
			if (c) {
				newColours[name] = c.brighter(i * 0.3).formatHex();
			}
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
