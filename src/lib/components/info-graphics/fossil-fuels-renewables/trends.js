/**
 * Simple linear trend extrapolation for the renewables-vs-fossils hero chart.
 *
 * For each series we fit a least-squares line over a recent window and project
 * it forward to `toTime`, anchored at the series' last actual point so the
 * dashed trend reads as a continuation of the solid line rather than a separate
 * forecast. This is deliberately naive — an indicative straight-line trend, not
 * a model — so the chart can annotate it honestly as a "simple trend".
 */

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

/**
 * @typedef {{ time: number, value: number }} TrendPoint
 * @typedef {{ key: string, points: [TrendPoint, TrendPoint] }} Trend
 */

/**
 * @param {TimeSeriesData[]} dataset
 * @param {string[]} keys series keys to fit (e.g. renewables + fossils)
 * @param {Object} [options]
 * @param {number} [options.toTime] extrapolate each line out to this timestamp (ms)
 * @param {number} [options.windowYears] only fit the trailing N years (default 10)
 * @param {[number, number]} [options.clamp] clamp the projected endpoint value
 * @returns {Trend[]}
 */
export function computeTrends(dataset, keys, { toTime, windowYears = 10, clamp } = {}) {
	if (!Array.isArray(dataset) || dataset.length === 0 || !toTime) return [];

	return keys
		.map((key) => {
			const points = dataset
				.map((d) => ({
					time: /** @type {number} */ (/** @type {any} */ (d).time),
					value: /** @type {number} */ (/** @type {any} */ (d)[key])
				}))
				.filter((p) => p.time != null && typeof p.value === 'number' && Number.isFinite(p.value));
			if (points.length < 2) return null;

			const last = points[points.length - 1];
			if (toTime <= last.time) return null;

			// Fit over the trailing window so the slope reflects the current
			// trajectory; fall back to the full series if the window is too sparse.
			const windowStart = last.time - windowYears * YEAR_MS;
			const window = points.filter((p) => p.time >= windowStart);
			const sample = window.length >= 2 ? window : points;

			const slope = leastSquaresSlope(sample);
			let endValue = last.value + slope * (toTime - last.time);
			if (clamp) endValue = Math.min(clamp[1], Math.max(clamp[0], endValue));

			return /** @type {Trend} */ ({
				key,
				points: [
					{ time: last.time, value: last.value },
					{ time: toTime, value: endValue }
				]
			});
		})
		.filter((/** @type {Trend | null} */ t) => t != null);
}

/**
 * Linearly interpolate a trend's value at an arbitrary time, clamped to its
 * endpoints so points outside the projected range just hold the nearest value.
 *
 * @param {{ points: TrendPoint[] }} trend
 * @param {number} time
 * @returns {number}
 */
export function interpolateTrendValue(trend, time) {
	const start = trend.points[0];
	const end = trend.points[trend.points.length - 1];
	if (time <= start.time) return start.value;
	if (time >= end.time) return end.value;
	const fraction = (time - start.time) / (end.time - start.time);
	return start.value + fraction * (end.value - start.value);
}

/**
 * Build synthetic monthly rows spanning the projected region so the chart's
 * hover layer can snap to the trend and read out its interpolated values. Each
 * row carries every trend's value under its series key plus an `isTrend` flag so
 * the tooltip can label the readout as projected. Rows start the month *after*
 * each trend's anchor to avoid colliding with the last real data point.
 *
 * @param {Trend[]} trends
 * @returns {(TimeSeriesData & { isTrend: true })[]}
 */
export function buildTrendHoverRows(trends) {
	if (!Array.isArray(trends) || trends.length === 0) return [];

	const start = Math.min(...trends.map((t) => t.points[0].time));
	const end = Math.max(...trends.map((t) => t.points[t.points.length - 1].time));

	const rows = [];
	const cursor = new Date(start);
	cursor.setUTCMonth(cursor.getUTCMonth() + 1); // skip the anchor month (real data)
	while (cursor.getTime() <= end) {
		const time = cursor.getTime();
		/** @type {any} */
		const row = { time, date: new Date(time), isTrend: true };
		for (const trend of trends) {
			row[trend.key] = interpolateTrendValue(trend, time);
		}
		rows.push(row);
		cursor.setUTCMonth(cursor.getUTCMonth() + 1);
	}
	return rows;
}

/**
 * Least-squares slope (value per millisecond) over the sample points.
 *
 * @param {TrendPoint[]} points
 * @returns {number}
 */
function leastSquaresSlope(points) {
	const n = points.length;
	let meanX = 0;
	let meanY = 0;
	for (const p of points) {
		meanX += p.time;
		meanY += p.value;
	}
	meanX /= n;
	meanY /= n;

	let numerator = 0;
	let denominator = 0;
	for (const p of points) {
		const dx = p.time - meanX;
		numerator += dx * (p.value - meanY);
		denominator += dx * dx;
	}
	return denominator === 0 ? 0 : numerator / denominator;
}
