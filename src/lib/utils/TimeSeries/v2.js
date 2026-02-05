/**
 * TimeSeries v2
 *
 * A modernized time series processor with:
 * - ES6 class syntax
 * - Cleaner transformation pipeline
 * - Better date handling
 * - Flexible aggregation
 * - Improved type definitions
 */

/**
 * @typedef {Object} TimeSeriesOptions
 * @property {string} [statsType] - Type of stats ('history' | 'forecast')
 * @property {(acc: Object, item: any) => Object} [labelReducer] - Custom label reducer
 * @property {(acc: Object, item: any) => Object} [colourReducer] - Custom colour reducer
 */

/**
 * @typedef {Object} TimeSeriesDataPoint
 * @property {Date} date - The date of this data point
 * @property {number} time - Unix timestamp in milliseconds
 * @property {number} [_min] - Minimum value (for stacked data)
 * @property {number} [_max] - Maximum value (for stacked data)
 */

export default class TimeSeriesV2 {
	/**
	 * @param {any[]} statsData - Raw statistics data (from Statistic)
	 * @param {TimeSeriesOptions} [options]
	 */
	constructor(statsData, options = {}) {
		const { statsType = 'history', labelReducer, colourReducer } = options;

		/** @type {any[]} */
		this.statsData = statsData;

		/** @type {string} */
		this.statsType = statsType;

		/** @type {any[]} */
		this.data = [];

		/** @type {string[]} */
		this.seriesNames = statsData.map((d) => d.fuel_tech || d.id);

		/** @type {{ [x: string]: string }} */
		this.seriesLabels = /** @type {any} */ (this._buildLabels(labelReducer));

		/** @type {{ [x: string]: string }} */
		this.seriesColours = /** @type {any} */ (this._buildColours(colourReducer));

		/** @type {number} */
		this.minY = 0;

		/** @type {number} */
		this.maxY = 0;
	}

	/**
	 * Build labels map
	 * @private
	 * @param {((acc: Object, item: any) => Object) | undefined} reducer
	 */
	_buildLabels(reducer) {
		if (reducer) {
			return this.statsData.reduce(reducer, {});
		}

		/** @type {Object.<string, string>} */
		const labels = {};
		this.statsData.forEach((/** @type {any} */ d) => {
			const id = d.fuel_tech || d.id;
			/** @type {any} */ (labels)[id] = d.label || d.name || id;
		});
		return labels;
	}

	/**
	 * Build colours map
	 * @private
	 * @param {((acc: Object, item: any) => Object) | undefined} reducer
	 */
	_buildColours(reducer) {
		if (reducer) {
			return this.statsData.reduce(reducer, {});
		}

		/** @type {Object.<string, string>} */
		const colours = {};
		this.statsData.forEach((/** @type {any} */ d) => {
			const id = d.fuel_tech || d.id;
			/** @type {any} */ (colours)[id] = d.colour || '#999';
		});
		return colours;
	}

	/**
	 * Transform statistics data to time series format
	 * @returns {TimeSeriesV2}
	 */
	transform() {
		if (!this.statsData.length) {
			this.data = [];
			return this;
		}

		// Get time information from first dataset
		const first = this.statsData[0];
		const statsObj = first[this.statsType];

		if (!statsObj) {
			this.data = [];
			return this;
		}

		const { start, data: firstData } = statsObj;
		const interval = this._parseInterval(statsObj.interval || '5m');

		// Build time series data
		const startDate = new Date(start);
		const dataPoints = [];

		for (let i = 0; i < firstData.length; i++) {
			const time = startDate.getTime() + i * interval;
			const point = {
				date: new Date(time),
				time
			};

			// Add values from each series
			this.statsData.forEach((/** @type {any} */ series) => {
				const id = series.fuel_tech || series.id;
				const value = series[this.statsType]?.data?.[i];
				/** @type {any} */ (point)[id] = value ?? null;
			});

			dataPoints.push(point);
		}

		this.data = dataPoints;
		return this;
	}

	/**
	 * Parse interval string to milliseconds
	 * @private
	 * @param {string} interval
	 */
	_parseInterval(interval) {
		const match = interval.match(/^(\d+)([mhd])$/);
		if (!match) return 5 * 60 * 1000; // Default 5 minutes

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
	 * Aggregate data to a larger interval
	 *
	 * @param {string} targetInterval - Target interval (e.g., '30m', '1h')
	 * @param {'sum' | 'mean'} [method='mean'] - Aggregation method
	 * @returns {TimeSeriesV2}
	 */
	aggregate(targetInterval, method = 'mean') {
		const targetMs = this._parseInterval(targetInterval);
		const buckets = new Map();

		for (const point of this.data) {
			const bucketTime = Math.floor(point.time / targetMs) * targetMs;

			if (!buckets.has(bucketTime)) {
				buckets.set(bucketTime, {
					time: bucketTime,
					date: new Date(bucketTime),
					_count: 0,
					_values: {}
				});

				// Initialize value arrays for each series
				this.seriesNames.forEach((name) => {
					buckets.get(bucketTime)._values[name] = [];
				});
			}

			const bucket = buckets.get(bucketTime);
			bucket._count++;

			// Collect values for each series
			this.seriesNames.forEach((/** @type {string} */ name) => {
				const value = /** @type {any} */ (point)[name];
				if (value !== null && value !== undefined) {
					bucket._values[name].push(value);
				}
			});
		}

		// Compute final values
		const aggregated = [];
		for (const bucket of buckets.values()) {
			const point = {
				date: bucket.date,
				time: bucket.time
			};

			this.seriesNames.forEach((/** @type {string} */ name) => {
				const values = bucket._values[name];
				if (values.length === 0) {
					/** @type {any} */ (point)[name] = null;
				} else if (method === 'sum') {
					/** @type {any} */ (point)[name] = values.reduce((/** @type {number} */ a, /** @type {number} */ b) => a + b, 0);
				} else {
					// mean
					/** @type {any} */ (point)[name] = values.reduce((/** @type {number} */ a, /** @type {number} */ b) => a + b, 0) / values.length;
				}
			});

			aggregated.push(point);
		}

		// Sort by time
		aggregated.sort((a, b) => a.time - b.time);
		this.data = aggregated;

		return this;
	}

	/**
	 * Filter data by date range
	 *
	 * @param {Date} startDate
	 * @param {Date} endDate
	 * @returns {TimeSeriesV2}
	 */
	filterByDateRange(startDate, endDate) {
		const startTime = startDate.getTime();
		const endTime = endDate.getTime();

		this.data = this.data.filter((d) => d.time >= startTime && d.time <= endTime);

		return this;
	}

	/**
	 * Calculate and update min/max values for stacked charts
	 *
	 * @param {string[]} [negativeIds] - IDs that should be treated as negative values
	 * @returns {TimeSeriesV2}
	 */
	updateMinMax(negativeIds = []) {
		const negativeSet = new Set(negativeIds);

		this.data = this.data.map((/** @type {any} */ point) => {
			let positiveSum = 0;
			let negativeSum = 0;

			this.seriesNames.forEach((/** @type {string} */ name) => {
				const value = /** @type {any} */ (point)[name];
				if (value === null || value === undefined) return;

				if (negativeSet.has(name) || value < 0) {
					negativeSum += Math.abs(value);
				} else {
					positiveSum += value;
				}
			});

			return {
				...point,
				_min: -negativeSum,
				_max: positiveSum
			};
		});

		// Update overall min/max
		this.minY = Math.min(...this.data.map((d) => d._min || 0));
		this.maxY = Math.max(...this.data.map((d) => d._max || 0));

		return this;
	}

	/**
	 * Convert to percentage values
	 *
	 * @param {string} [totalKey] - Key to use as 100% reference, or calculates total if not provided
	 * @returns {TimeSeriesV2}
	 */
	toPercentage(totalKey) {
		this.data = this.data.map((/** @type {any} */ point) => {
			let total;

			if (totalKey && /** @type {any} */ (point)[totalKey] !== undefined) {
				total = Math.abs(/** @type {any} */ (point)[totalKey]);
			} else {
				// Calculate total from all series
				total = this.seriesNames.reduce((/** @type {number} */ sum, /** @type {string} */ name) => {
					const val = /** @type {any} */ (point)[name];
					return sum + (val !== null && val !== undefined ? Math.abs(val) : 0);
				}, 0);
			}

			/** @type {any} */
			const newPoint = {
				date: point.date,
				time: point.time
			};

			this.seriesNames.forEach((/** @type {string} */ name) => {
				const value = /** @type {any} */ (point)[name];
				if (value === null || value === undefined || total === 0) {
					newPoint[name] = 0;
				} else {
					newPoint[name] = (value / total) * 100;
				}
			});

			return newPoint;
		});

		return this;
	}

	/**
	 * Get the transformed data
	 * @returns {any[]}
	 */
	getData() {
		return this.data;
	}

	/**
	 * Export to chart-ready format
	 */
	toChartFormat() {
		return {
			data: this.data,
			seriesNames: this.seriesNames,
			seriesLabels: this.seriesLabels,
			seriesColours: this.seriesColours,
			minY: this.minY,
			maxY: this.maxY
		};
	}

	/**
	 * Create from raw data without statistics wrapper
	 *
	 * @param {any[]} data - Array of data points with date/time
	 * @param {string[]} seriesNames - Names of the series
	 * @param {Object} [options]
	 * @returns {TimeSeriesV2}
	 */
	static fromRawData(data, seriesNames, options = {}) {
		const instance = new TimeSeriesV2([], options);
		instance.data = data;
		instance.seriesNames = seriesNames;
		return instance;
	}
}
