/**
 * Shared utility for combining historical and projection time series data.
 * Used by process-technology, process-scenario, and process-region pipelines.
 *
 * @param {{
 *   historicalTimeSeries: import('$lib/utils/TimeSeries').default,
 *   projectionTimeSeries: import('$lib/utils/TimeSeries').default | { data: TimeSeriesData[], seriesNames: string[], seriesColours: Object.<string, string>, seriesLabels: Object.<string, string>, statsDatasets?: any[] },
 *   loadSeries?: string[],
 *   order?: FuelTechCode[],
 *   trimSide?: 'history' | 'projection',
 *   baseUnit?: string,
 *   prefix?: SiPrefix,
 *   displayPrefix?: SiPrefix,
 *   allowedPrefixes?: SiPrefix[],
 *   chartType?: 'area' | 'line'
 * }} options
 * @returns {ProcessedDataViz}
 */
export default function combineHistoryProjection({
	historicalTimeSeries,
	projectionTimeSeries,
	loadSeries = [],
	order = [],
	trimSide = 'history',
	baseUnit = '',
	prefix = /** @type {SiPrefix} */ (''),
	displayPrefix = /** @type {SiPrefix} */ (''),
	allowedPrefixes = [],
	chartType = 'area'
}) {
	const historicalTimeSeriesData = historicalTimeSeries.data;
	const projectionTimeSeriesData = projectionTimeSeries.data;

	const lastHistory = historicalTimeSeriesData[historicalTimeSeriesData.length - 1];
	const firstProjection = projectionTimeSeriesData[0];

	if (!lastHistory?.time || !firstProjection?.time) {
		return emptyResult({ baseUnit, prefix, displayPrefix, allowedPrefixes, chartType });
	}

	// Handle overlapping timestamps at the boundary
	let historyData = historicalTimeSeriesData;
	let projectionData = projectionTimeSeriesData;

	if (lastHistory.time === firstProjection.time) {
		if (trimSide === 'history') {
			historyData = historicalTimeSeriesData.slice(0, -1);
		} else {
			projectionData = projectionTimeSeriesData.slice(1);
		}
	}

	const seriesData = [...historyData, ...projectionData];

	// Determine series names — use order if provided, otherwise merge both sets
	/** @type {string[]} */
	let seriesNames = [];
	if (order && order.length > 0) {
		const combinedStats = [
			...(projectionTimeSeries.statsDatasets || []),
			...(historicalTimeSeries.statsDatasets || [])
		];
		order.forEach((code) => {
			const stats = combinedStats.find((d) => d.code === code);
			if (stats) {
				seriesNames.push(stats.id);
			}
		});
	} else {
		seriesNames = [
			...new Set([...projectionTimeSeries.seriesNames, ...historicalTimeSeries.seriesNames])
		];
	}

	// Fill missing series values with null
	seriesData.forEach((d) => {
		seriesNames.forEach((name) => {
			if (!d[name]) {
				d[name] = null;
			}
		});
	});

	// Merge colours and labels from both series
	/** @type {Object.<string, string>} */
	const seriesColours = {};
	/** @type {Object.<string, string>} */
	const seriesLabels = {};
	seriesNames.forEach((name) => {
		seriesColours[name] =
			historicalTimeSeries.seriesColours[name] || projectionTimeSeries.seriesColours[name];
		seriesLabels[name] =
			historicalTimeSeries.seriesLabels[name] || projectionTimeSeries.seriesLabels[name];
	});

	// Compute yDomain
	let yDomain;
	if (chartType === 'area' && seriesData.length > 0) {
		const maxY = seriesData.map((d) => /** @type {number} */ (d._max ?? 0));
		const datasetMax = maxY.length ? Math.max(...maxY) : 0;
		const minY = seriesData.map((d) => /** @type {number} */ (d._min ?? 0));
		const datasetMin = minY.length ? Math.min(...minY) : 0;
		yDomain = [datasetMin, datasetMax];
	} else {
		yDomain = [0, null];
	}

	// Compute projection start/end times for hatch overlay
	const projectionStartTime = projectionTimeSeriesData[0]?.time ?? null;
	const projectionEndTime =
		projectionTimeSeriesData[projectionTimeSeriesData.length - 1]?.time ?? null;

	return {
		seriesData,
		seriesNames,
		nameOptions: [...seriesNames].reverse().map((name) => ({ label: name, value: name })),
		seriesColours,
		seriesLabels,
		seriesLoadsIds: loadSeries,
		yDomain,
		projectionStartTime,
		projectionEndTime,
		prefix,
		baseUnit,
		displayPrefix,
		allowedPrefixes,
		chartType
	};
}

/**
 * @param {{ baseUnit: string, prefix: SiPrefix, displayPrefix: SiPrefix, allowedPrefixes: SiPrefix[], chartType: 'area' | 'line' }} defaults
 * @returns {ProcessedDataViz}
 */
function emptyResult({ baseUnit, prefix, displayPrefix, allowedPrefixes, chartType }) {
	return {
		seriesData: [],
		seriesNames: [],
		seriesColours: {},
		seriesLabels: {},
		nameOptions: [],
		seriesLoadsIds: [],
		yDomain: [],
		projectionStartTime: null,
		projectionEndTime: null,
		prefix,
		baseUnit,
		displayPrefix,
		allowedPrefixes,
		chartType
	};
}
