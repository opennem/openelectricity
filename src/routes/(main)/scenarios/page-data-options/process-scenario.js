import { color } from 'd3-color';
import TimeSeries from '$lib/utils/TimeSeries';
import parseInterval from '$lib/utils/intervals';
import { loadFuelTechs } from '$lib/fuel_techs.js';

import { fuelTechMap } from './groups-scenario';
import { scenarioLabels } from './descriptions';
import { scenarioColourMap } from './models';
import sumFuelTechData from './sum-fuel-tech-data';
import combineHistoryProjection from './combine-history-projection';
import { mutateDatesToStartOfYear, mergeHistoricalEmissionsData, currentFinancialYear } from './utils';

/**
 * Group projection stats by start date, transform each group into a TimeSeries,
 * then merge them into a single projection object. This handles scenarios from
 * different ISP models that have different projection start dates.
 *
 * @param {StatsData[]} stats
 * @returns {{ data: TimeSeriesData[], seriesNames: string[], seriesColours: Record<string, string>, seriesLabels: Record<string, string> }}
 */
function mergeProjectionsByStartDate(stats) {
	const starts = [...new Set(stats.map((d) => d.projection?.start))].map((d) => {
		const group = stats.filter((s) => s.projection?.start === d);
		const timeSeries = new TimeSeries(
			group,
			parseInterval('1Y'),
			'projection',
			undefined,
			undefined
		).transform();

		timeSeries.data = mutateDatesToStartOfYear(timeSeries.data, 1);

		return { start: d, timeSeries };
	});

	/** @type {TimeSeriesData[]} */
	let mergedData = [];
	starts.forEach((start) => {
		if (mergedData.length === 0) {
			mergedData = [...start.timeSeries.data];
		} else {
			start.timeSeries.data.forEach((d) => {
				const index = mergedData.findIndex((m) => m.date.getTime() === d.date.getTime());
				if (index !== -1) {
					mergedData[index] = { ...mergedData[index], ...d };
				} else {
					mergedData.push(d);
				}
			});
		}
	});

	mergedData.sort((a, b) => a.time - b.time);

	const result = starts.reduce(
		(/** @type {any} */ acc, start) => ({
			data: [],
			seriesNames: [...acc.seriesNames, ...start.timeSeries.seriesNames],
			seriesColours: { ...acc.seriesColours, ...start.timeSeries.seriesColours },
			seriesLabels: { ...acc.seriesLabels, ...start.timeSeries.seriesLabels },
			statsType: 'projection',
			maxY: 0,
			minY: 0,
			statsInterval: start.timeSeries.statsInterval
		}),
		{ data: [], seriesNames: [], seriesColours: {}, seriesLabels: {} }
	);

	result.data = mergedData;
	return result;
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

	const projectionTimeSeries = mergeProjectionsByStartDate(scenarioProjectionStats);
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
		chartType: 'line',
		keepFullHistory: true
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

	const projectionTimeSeries = mergeProjectionsByStartDate(scenarioProjectionStats);
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

	// Capacity is already in FY — add 1 year to align display dates
	historicalTimeSeries.data = mutateDatesToStartOfYear(historicalTimeSeries.data, 1).filter(
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
		chartType: 'line',
		keepFullHistory: true
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

	const projectionTimeSeries = mergeProjectionsByStartDate(scenarioProjectionStats);
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
		chartType: 'line',
		keepFullHistory: true
	});
}

/**
 * @param {{processedEmissions: ProcessedDataViz, processedEnergy: ProcessedDataViz}} param0
 * @returns {ProcessedDataViz}
 */
function intensity({ processedEmissions, processedEnergy }) {
	const seriesNames = processedEmissions.seriesNames;

	// Build a time-keyed lookup for energy data so we match by date, not index.
	// Emissions and energy arrays can differ in length when scenarios have
	// different projection start dates (e.g. 2018 vs 2026 ISP).
	/** @type {Map<number, Record<string, any>>} */
	const energyByTime = new Map();
	processedEnergy.seriesData.forEach((d) => {
		energyByTime.set(d.time, d);
	});

	const seriesData = processedEmissions.seriesData.map((d) => {
		/** @type {TimeSeriesData} */
		const obj = /** @type {any} */ ({
			date: d.date,
			time: d.time
		});

		const energyRecord = energyByTime.get(d.time);

		seriesNames.forEach((/** @type {string} */ name) => {
			/** @type {Record<string, any>} */
			const dRecord = d;
			if (dRecord[name] && energyRecord && energyRecord[name]) {
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
 * @param {Record<string, string>} [overrides]
 * @returns {Record<string, string>}
 */
function getScenarioColours(seriesNames, overrides = {}) {
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

	for (const [key, value] of Object.entries(overrides)) {
		if (key in newColours && value) {
			newColours[key] = value;
		}
	}

	return newColours;
}

export default {
	generation,
	capacity,
	emissions,
	intensity,
	getScenarioColours
};
