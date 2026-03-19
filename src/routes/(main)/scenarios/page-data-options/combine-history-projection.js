import { addYears } from 'date-fns';

const ONE_YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

/**
 * Linearly interpolate gap years between the last history row and the first projection row.
 * Each interpolated row is marked with `_derived: true`.
 *
 * @param {TimeSeriesData} lastRow - last history data point
 * @param {TimeSeriesData} firstRow - first projection data point
 * @param {number} gapYears - number of missing years to fill
 * @param {string[]} seriesNames - series keys to interpolate
 * @returns {TimeSeriesData[]}
 */
function interpolateGap(lastRow, firstRow, gapYears, seriesNames) {
	/** @type {TimeSeriesData[]} */
	const rows = [];

	for (let i = 1; i <= gapYears; i++) {
		const date = addYears(lastRow.date, i);
		const t = i / (gapYears + 1);

		/** @type {TimeSeriesData} */
		const row = /** @type {any} */ ({ date, time: date.getTime(), _derived: true });

		// Interpolate each series value
		for (const name of seriesNames) {
			const a = lastRow[name];
			const b = firstRow[name];
			if (a == null || b == null) {
				row[name] = null;
			} else {
				row[name] = /** @type {number} */ (a) + t * (/** @type {number} */ (b) - /** @type {number} */ (a));
			}
		}

		// Interpolate _min and _max for stacked area rendering
		const lastMin = /** @type {number} */ (lastRow._min ?? 0);
		const firstMin = /** @type {number} */ (firstRow._min ?? 0);
		const lastMax = /** @type {number} */ (lastRow._max ?? 0);
		const firstMax = /** @type {number} */ (firstRow._max ?? 0);
		row._min = lastMin + t * (firstMin - lastMin);
		row._max = lastMax + t * (firstMax - lastMax);

		rows.push(row);
	}

	return rows;
}

/**
 * Shared utility for combining historical and projection time series data.
 * Used by process-technology, process-scenario, and process-region pipelines.
 *
 * @param {{
 *   historicalTimeSeries: import('$lib/utils/TimeSeries').default,
 *   projectionTimeSeries: import('$lib/utils/TimeSeries').default | { data: TimeSeriesData[], seriesNames: string[], seriesColours: Object.<string, string>, seriesLabels: Object.<string, string>, statsDatasets?: any[] },
 *   loadSeries?: string[],
 *   order?: FuelTechCode[],
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

	// Handle overlap: trim history points that fall within projection range
	// Projection data is authoritative over history in the overlap region
	let historyData = historicalTimeSeriesData;
	let projectionData = projectionTimeSeriesData;

	if (firstProjection.time <= lastHistory.time) {
		historyData = historicalTimeSeriesData.filter((d) => d.time < firstProjection.time);
	}

	// Detect gap between history and projection (more than 1 year apart)
	const lastHistoryRow = historyData[historyData.length - 1];
	const firstProjectionRow = projectionData[0];
	const gapYears = Math.round((firstProjectionRow.time - lastHistoryRow.time) / ONE_YEAR_MS) - 1;

	// Determine series names early so interpolation can use them
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

	// Fill gap with linearly interpolated rows
	const interpolatedRows = gapYears >= 1
		? interpolateGap(lastHistoryRow, firstProjectionRow, gapYears, seriesNames)
		: [];

	const seriesData = [...historyData, ...interpolatedRows, ...projectionData];

	// Fill missing series values with null
	seriesData.forEach((d) => {
		seriesNames.forEach((name) => {
			if (d[name] === undefined) {
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

	// Compute derived range from any _derived data points (including interpolated rows)
	const derivedRows = seriesData.filter((d) => d._derived);
	const derivedStartTime = derivedRows.length > 0 ? derivedRows[0].time : null;
	const derivedEndTime = derivedRows.length > 0 ? projectionStartTime : null;

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
		derivedStartTime,
		derivedEndTime,
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
		derivedStartTime: null,
		derivedEndTime: null,
		prefix,
		baseUnit,
		displayPrefix,
		allowedPrefixes,
		chartType
	};
}

export { interpolateGap };
