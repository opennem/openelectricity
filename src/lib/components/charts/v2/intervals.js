/**
 * Interval Utilities for Chart v2
 *
 * Utilities for handling time intervals and data aggregation.
 */

/**
 * Available interval options for power/energy data
 */
export const INTERVAL_OPTIONS = [
	{ label: '5 min', value: '5m' },
	{ label: '30 min', value: '30m' }
];

/**
 * Parse interval string to milliseconds
 * @param {string} interval - Interval string (e.g., '5m', '30m', '1h')
 * @returns {number} Interval in milliseconds
 */
export function parseIntervalMs(interval) {
	const match = interval.match(/^(\d+)([mhd])$/);
	if (!match) return 5 * 60 * 1000; // Default to 5 minutes

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

/**
 * Aggregate data points to a larger interval
 * @param {any[]} data - Array of data points with 'time' property
 * @param {string} targetInterval - Target interval (e.g., '30m')
 * @param {string[]} valueKeys - Keys to aggregate (sum)
 * @returns {any[]} Aggregated data
 */
export function aggregateToInterval(data, targetInterval, valueKeys) {
	if (!data || data.length === 0) return [];

	const intervalMs = parseIntervalMs(targetInterval);
	/** @type {Map<number, any>} */
	const buckets = new Map();

	for (const item of data) {
		// Round down to the nearest interval
		const bucketTime = Math.floor(item.time / intervalMs) * intervalMs;

		if (!buckets.has(bucketTime)) {
			buckets.set(bucketTime, {
				time: bucketTime,
				date: new Date(bucketTime),
				_count: 0
			});
		}

		const bucket = buckets.get(bucketTime);
		bucket._count++;

		// Sum values for each key
		for (const key of valueKeys) {
			if (item[key] !== undefined) {
				bucket[key] = (bucket[key] || 0) + item[key];
			}
		}
	}

	// Convert to array and sort by time
	const result = Array.from(buckets.values());
	result.sort((a, b) => a.time - b.time);

	return result;
}

/**
 * Calculate average values for aggregated data
 * @param {any[]} data - Aggregated data with _count property
 * @param {string[]} valueKeys - Keys to average
 * @returns {any[]} Data with averaged values
 */
export function averageAggregatedData(data, valueKeys) {
	return data.map((/** @type {any} */ item) => {
		/** @type {any} */
		const result = { ...item };
		const count = item._count || 1;

		for (const key of valueKeys) {
			if (result[key] !== undefined) {
				result[key] = result[key] / count;
			}
		}

		return result;
	});
}

/**
 * Aggregate and average data to a target interval
 * @param {any[]} data - Source data
 * @param {string} targetInterval - Target interval
 * @param {string[]} valueKeys - Keys to aggregate
 * @returns {any[]} Aggregated and averaged data
 */
export function aggregateData(data, targetInterval, valueKeys) {
	const aggregated = aggregateToInterval(data, targetInterval, valueKeys);
	return averageAggregatedData(aggregated, valueKeys);
}

/**
 * Get the interval from data by looking at time differences
 * @param {Array<{time: number}>} data
 * @returns {number} Interval in milliseconds
 */
export function detectInterval(data) {
	if (!data || data.length < 2) return 5 * 60 * 1000;

	// Sample a few intervals and find the most common
	const intervals = [];
	for (let i = 1; i < Math.min(10, data.length); i++) {
		intervals.push(data[i].time - data[i - 1].time);
	}

	// Return the mode (most common value)
	const counts = new Map();
	for (const interval of intervals) {
		counts.set(interval, (counts.get(interval) || 0) + 1);
	}

	let maxCount = 0;
	let mode = intervals[0];
	for (const [interval, count] of counts) {
		if (count > maxCount) {
			maxCount = count;
			mode = interval;
		}
	}

	return mode;
}

/**
 * Check if data needs to be aggregated to reach target interval
 * @param {Array<{time: number}>} data
 * @param {string} targetInterval
 * @returns {boolean}
 */
export function needsAggregation(data, targetInterval) {
	const currentInterval = detectInterval(data);
	const targetMs = parseIntervalMs(targetInterval);
	return currentInterval < targetMs;
}
