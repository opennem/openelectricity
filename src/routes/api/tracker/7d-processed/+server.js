/**
 * 7-Day Tracker API with Server-Side Processing
 *
 * Returns pre-processed chart-ready data to reduce client-side computation.
 */
import { error } from '@sveltejs/kit';
import { PUBLIC_JSON_API } from '$env/static/public';
import { fuelTechColourMap } from '$lib/theme/openelectricity';
import { loadFuelTechs, fuelTechNameMap } from '$lib/fuel_techs';
import simpleGroup from '$lib/fuel-tech-groups/simple-with-split-solar';

// Use the simple group configuration
const fuelTechMap = simpleGroup.fuelTechs;
const groupOrder = simpleGroup.order;

/**
 * Create a colour reducer using the static colour map
 * @param {Record<string, string>} colourMap
 */
function createColourReducer(colourMap) {
	return (/** @type {Record<string, string>} */ acc, /** @type {any} */ d) => {
		const id = d.fuel_tech;
		acc[id] = colourMap[id] || '#999';
		return acc;
	};
}

/**
 * Create a label reducer
 */
function createLabelReducer() {
	return (/** @type {Record<string, string>} */ acc, /** @type {any} */ d) => {
		const id = d.fuel_tech;
		acc[id] = fuelTechNameMap[id] || d.label || id;
		return acc;
	};
}

/**
 * Invert values for load fuel techs (make them negative)
 * @param {any[]} data
 * @param {string[]} loadsToInvert
 */
function invertValues(data, loadsToInvert) {
	return data.map((d) => {
		// Match on fuel_tech specifically (like the original Statistic.invertValues)
		if (d.fuel_tech && loadsToInvert.includes(d.fuel_tech)) {
			return {
				...d,
				history: {
					...d.history,
					data: d.history.data.map((/** @type {number | null} */ v) =>
						v !== null ? -Math.abs(v) : null
					)
				},
				isLoad: true
			};
		}
		return d;
	});
}

/**
 * Group data by fuel tech groups
 * @param {any[]} data
 * @param {Record<string, string[]>} groupMap
 */
function groupData(data, groupMap) {
	const grouped = [];

	for (const [groupId, sourceIds] of Object.entries(groupMap)) {
		// Match on fuel_tech field specifically (like the original Statistic.group)
		const sources = data.filter((d) => d.fuel_tech && sourceIds.includes(d.fuel_tech));

		if (sources.length === 0) continue;

		// Get the first source as template
		const template = sources[0];
		if (!template.history?.data || !template.history?.start) {
			console.warn(`groupData: Skipping group ${groupId} - missing history data`);
			continue;
		}

		const historyLength = template.history.data.length;

		// Sum up all source values
		const summedData = new Array(historyLength).fill(0);
		let hasLoad = false;

		for (const source of sources) {
			if (source.isLoad) hasLoad = true;
			const values = source.history?.data || [];
			for (let i = 0; i < values.length; i++) {
				if (values[i] !== null) {
					summedData[i] = (summedData[i] || 0) + values[i];
				}
			}
		}

		grouped.push({
			id: groupId,
			fuel_tech: groupId,
			type: template.type,
			units: template.units,
			isLoad: hasLoad,
			history: {
				start: template.history?.start,
				last: template.history?.last,
				interval: template.history?.interval,
				data: summedData
			}
		});
	}

	return grouped;
}

/**
 * Reorder data according to specified order
 * @param {any[]} data
 * @param {string[]} order
 */
function reorderData(data, order) {
	return order.map((id) => data.find((d) => d.fuel_tech === id)).filter((d) => d !== undefined);
}

/**
 * Transform statistics data to time series format
 * @param {any[]} statsData
 * @param {string} statsType
 */
function transformToTimeSeries(statsData, statsType = 'history') {
	if (!statsData.length) return [];

	const seriesNames = statsData.map((d) => d.fuel_tech);

	// Get time range from first series
	const firstSeries = statsData[0];
	const startStr = firstSeries[statsType]?.start;
	const lastStr = firstSeries[statsType]?.last;
	const interval = firstSeries[statsType]?.interval || '5m';
	const dataLength = firstSeries[statsType]?.data?.length || 0;

	if (!startStr || !dataLength) {
		console.error('transformToTimeSeries: Missing start or data', { startStr, dataLength });
		return [];
	}

	// Parse start date and interval
	const startDate = new Date(startStr);

	if (isNaN(startDate.getTime())) {
		console.error('transformToTimeSeries: Invalid start date', startStr);
		return [];
	}

	const intervalMs = parseInterval(interval);

	// Build time series data
	/** @type {any[]} */
	const timeSeriesData = [];

	for (let i = 0; i < dataLength; i++) {
		const time = startDate.getTime() + i * intervalMs;
		/** @type {any} */
		const point = {
			date: new Date(time),
			time: time
		};

		for (const series of statsData) {
			const id = series.fuel_tech;
			const value = series[statsType]?.data?.[i];
			// Convert from MW to GW (divide by 1000)
			point[id] = value !== null && value !== undefined ? value / 1000 : null;
		}

		timeSeriesData.push(point);
	}

	return timeSeriesData;
}

/**
 * Aggregate time series data to target interval
 * @param {any[]} data
 * @param {string[]} seriesNames
 * @param {string} targetInterval
 */
function aggregateToInterval(data, seriesNames, targetInterval) {
	if (!data.length) return [];

	const targetMs = parseInterval(targetInterval);
	const buckets = new Map();

	for (const point of data) {
		if (!point.time || isNaN(point.time)) continue;

		const bucketTime = Math.floor(point.time / targetMs) * targetMs;

		if (!buckets.has(bucketTime)) {
			buckets.set(bucketTime, {
				time: bucketTime,
				_values: {},
				_count: 0
			});

			seriesNames.forEach((name) => {
				buckets.get(bucketTime)._values[name] = [];
			});
		}

		const bucket = buckets.get(bucketTime);
		bucket._count++;

		seriesNames.forEach((name) => {
			const value = point[name];
			if (value !== null && value !== undefined && !isNaN(value)) {
				bucket._values[name].push(value);
			}
		});
	}

	const result = [];
	for (const bucket of buckets.values()) {
		// Skip invalid buckets
		if (!bucket.time || isNaN(bucket.time)) continue;

		/** @type {any} */
		const point = {
			date: new Date(bucket.time).toISOString(),
			time: bucket.time
		};

		seriesNames.forEach((name) => {
			const values = bucket._values[name];
			if (values.length === 0) {
				point[name] = null;
			} else {
				// Use mean for aggregation
				point[name] = values.reduce((a, b) => a + b, 0) / values.length;
			}
		});

		result.push(point);
	}

	return result.sort((a, b) => a.time - b.time);
}

/**
 * Calculate min/max Y values considering loads
 * @param {any[]} data
 * @param {string[]} seriesNames
 * @param {string[]} loadSeries
 */
function calculateMinMax(data, seriesNames, loadSeries) {
	let minY = 0;
	let maxY = 0;

	for (const point of data) {
		let positiveSum = 0;
		let negativeSum = 0;

		for (const name of seriesNames) {
			const value = point[name];
			if (value !== null && value !== undefined) {
				if (loadSeries.includes(name) || value < 0) {
					negativeSum += value;
				} else {
					positiveSum += value;
				}
			}
		}

		minY = Math.min(minY, negativeSum);
		maxY = Math.max(maxY, positiveSum);
	}

	return { minY, maxY };
}

/**
 * Parse interval string to milliseconds
 * @param {string} interval
 */
function parseInterval(interval) {
	const match = interval.match(/^(\d+)([mhd])$/);
	if (!match) return 5 * 60 * 1000;

	const value = parseInt(match[1], 10);
	const unit = match[2];

	switch (unit) {
		case 'm':
			return value * 60 * 1000;
		case 'h':
			return value * 60 * 60 * 1000;
		case 'd':
			return value * 24 * 60 * 60 * 1000;
		default:
			return 5 * 60 * 1000;
	}
}

export async function GET({ fetch, url }) {
	const startTime = performance.now();

	let { searchParams } = url;
	let regionPath = searchParams.get('regionPath') || 'au/NEM';
	let targetInterval = searchParams.get('interval') || '30m';

	let res = await fetch(`${PUBLIC_JSON_API}/${regionPath}/power/7d.json`);

	if (!res.ok) {
		error(404, 'Not found');
	}

	let rawData = await res.json();

	// Filter to power data only
	const powerData = rawData.data.filter((/** @type {any} */ d) => d.type === 'power');

	if (!powerData.length) {
		error(404, 'No power data found');
	}

	// Step 1: Invert load values
	const invertedData = invertValues(powerData, loadFuelTechs);

	// Step 2: Group by fuel tech groups
	const groupedData = groupData(invertedData, fuelTechMap);

	// Step 3: Reorder according to group order
	const orderedData = reorderData(groupedData, groupOrder);

	if (!orderedData.length) {
		error(500, 'No data after grouping and ordering');
	}

	// Step 4: Build labels and colours
	const colourReducer = createColourReducer(fuelTechColourMap);
	const labelReducer = createLabelReducer();

	const seriesNames = orderedData.map((d) => d.fuel_tech);
	const seriesColours = orderedData.reduce(colourReducer, {});
	const seriesLabels = orderedData.reduce(labelReducer, {});

	if (!seriesNames.length) {
		console.error('No series names after processing');
		error(500, 'No series found after processing');
	}

	// Step 5: Transform to time series
	const timeSeriesData = transformToTimeSeries(orderedData, 'history');

	if (!timeSeriesData.length) {
		// Log first item to debug
		console.error(
			'No time series data. First ordered item:',
			JSON.stringify(orderedData[0], null, 2)
		);
		error(500, 'No time series data generated');
	}

	// Step 6: Aggregate to target interval
	const aggregatedData = aggregateToInterval(timeSeriesData, seriesNames, targetInterval);

	if (!aggregatedData.length) {
		error(500, 'No aggregated data generated');
	}

	// Step 7: Calculate min/max
	const loadSeries = orderedData.filter((d) => d.isLoad).map((d) => d.fuel_tech);
	const { minY, maxY } = calculateMinMax(aggregatedData, seriesNames, loadSeries);

	const processingTime = performance.now() - startTime;

	return Response.json(
		{
			data: aggregatedData,
			seriesNames,
			seriesColours,
			seriesLabels,
			minY,
			maxY,
			meta: {
				processingTimeMs: Math.round(processingTime),
				dataPoints: aggregatedData.length,
				interval: targetInterval
			}
		},
		{
			headers: {
				'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
			}
		}
	);
}
