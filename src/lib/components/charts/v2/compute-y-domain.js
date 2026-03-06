/**
 * Compute the Y domain [min, max] from series data with min/max values.
 * Uses reduce instead of Math.max(...spread) to avoid stack overflow on large datasets.
 *
 * @param {Array<Record<string, any>>} data - Array of data points with _min and _max fields
 * @param {{ padding?: number }} [options] - Options
 * @param {number} [options.padding=0.1] - Fractional padding to add (default 10%)
 * @returns {[number, number]} The [min, max] Y domain
 */
export function computeYDomain(data, options = {}) {
	const { padding = 0.1 } = options;

	if (!data || data.length === 0) return [0, 0];

	let datasetMax = -Infinity;
	let datasetMin = Infinity;

	for (const d of data) {
		const max = d._max ?? 0;
		const min = d._min ?? 0;
		if (max > datasetMax) datasetMax = max;
		if (min < datasetMin) datasetMin = min;
	}

	if (datasetMax === -Infinity) datasetMax = 0;
	if (datasetMin === Infinity) datasetMin = 0;

	const paddedMax = datasetMax + datasetMax * padding;
	const paddedMin = datasetMin < 0 ? datasetMin + datasetMin * padding : datasetMin;

	return [Math.floor(paddedMin), Math.ceil(paddedMax)];
}
