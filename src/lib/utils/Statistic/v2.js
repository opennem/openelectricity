/**
 * Statistic v2
 *
 * A modernized statistics processor with:
 * - ES6 class syntax
 * - Immutable operations (returns new instances)
 * - Flexible pipeline configuration
 * - Better TypeScript/JSDoc support
 * - Cleaner API
 */

import { parseUnit } from '../si-units';

/**
 * @typedef {Object} StatisticOptions
 * @property {string} [statsType] - Type of stats ('history' | 'forecast')
 * @property {string} [unit] - Unit of measurement
 * @property {boolean} [immutable] - If true, operations return new instances
 */

/**
 * @typedef {Object} GroupOptions
 * @property {Object.<string, string[]>} groupMap - Map of group names to source keys
 * @property {boolean} [preserveUngrouped] - Keep items not in any group
 */

export default class StatisticV2 {
	/**
	 * @param {any[]} data - Raw statistics data
	 * @param {StatisticOptions} [options]
	 */
	constructor(data, options = {}) {
		const { statsType = 'history', unit = '', immutable = false } = options;

		/** @type {any[]} */
		this.data = [...data];

		/** @type {any[]} */
		this.originalData = [...data];

		/** @type {string} */
		this.statsType = statsType;

		/** @type {string} */
		this.unit = unit;

		/** @type {boolean} */
		this.immutable = immutable;

		// Parse unit into components
		const parsed = parseUnit(unit);
		this.prefix = parsed.prefix || '';
		this.baseUnit = parsed.baseUnit || unit;

		// Calculate min interval from data
		this.minInterval = this._detectMinInterval();
	}

	/**
	 * Detect the minimum interval in the dataset
	 * @private
	 */
	_detectMinInterval() {
		if (!this.data.length) return null;

		const intervals = this.data.map((d) => d[this.statsType]?.interval).filter(Boolean);

		if (!intervals.length) return null;

		// Return the most common interval
		/** @type {any} */
		const counts = {};
		intervals.forEach((/** @type {any} */ i) => {
			counts[i] = (counts[i] || 0) + 1;
		});

		return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
	}

	/**
	 * Create a new instance (for immutable operations)
	 * @private
	 */
	_clone() {
		const clone = new StatisticV2(this.data, {
			statsType: this.statsType,
			unit: this.unit,
			immutable: this.immutable
		});
		clone.originalData = [...this.originalData];
		return clone;
	}

	/**
	 * Get the instance to operate on (this or clone)
	 * @private
	 */
	_getInstance() {
		return this.immutable ? this._clone() : this;
	}

	/**
	 * Invert values for specified items (e.g., make loads negative)
	 *
	 * @param {string[]} idsToInvert - IDs or fuel_tech codes to invert
	 * @returns {StatisticV2}
	 */
	invertValues(idsToInvert) {
		const instance = this._getInstance();

		instance.data.forEach((item) => {
			const id = item.fuel_tech || item.id;
			if (idsToInvert.includes(id)) {
				const statsData = item[instance.statsType];
				if (statsData?.data) {
					statsData.data = statsData.data.map((/** @type {any} */ v) => (v !== null && v !== undefined ? -v : v));
				}
			}
		});

		return instance;
	}

	/**
	 * Group data by a mapping
	 *
	 * @param {Object.<string, string[]>} groupMap - Map of group name to source IDs
	 * @param {Object} [options]
	 * @param {boolean} [options.preserveUngrouped] - Keep ungrouped items
	 * @returns {StatisticV2}
	 */
	group(groupMap, options = {}) {
		const { preserveUngrouped = false } = options;
		const instance = this._getInstance();

		const grouped = [];
		const groupedIds = new Set();

		for (const [groupName, sourceIds] of Object.entries(groupMap)) {
			const sources = instance.data.filter((d) => {
				const id = d.fuel_tech || d.id;
				return sourceIds.includes(id);
			});

			if (sources.length === 0) continue;

			// Mark these as grouped
			sources.forEach((s) => groupedIds.add(s.fuel_tech || s.id));

			// Create grouped item
			const first = sources[0];
			const statsData = first[instance.statsType];

			if (!statsData) continue;

			const groupedData = new Array(statsData.data.length).fill(0);

			// Sum all sources
			sources.forEach((source) => {
				const data = source[instance.statsType]?.data || [];
				data.forEach((/** @type {any} */ val, /** @type {any} */ i) => {
					if (val !== null && val !== undefined) {
						groupedData[i] = (groupedData[i] || 0) + val;
					}
				});
			});

			grouped.push({
				...first,
				id: groupName,
				fuel_tech: groupName,
				code: groupName,
				[instance.statsType]: {
					...statsData,
					data: groupedData
				}
			});
		}

		// Add ungrouped items if requested
		if (preserveUngrouped) {
			instance.data.forEach((item) => {
				const id = item.fuel_tech || item.id;
				if (!groupedIds.has(id)) {
					grouped.push({ ...item });
				}
			});
		}

		instance.data = grouped;
		return instance;
	}

	/**
	 * Reorder data according to specified order
	 *
	 * @param {string[]} order - Array of IDs in desired order
	 * @returns {StatisticV2}
	 */
	reorder(order) {
		const instance = this._getInstance();

		const ordered = [];
		const dataMap = new Map(instance.data.map((d) => [d.fuel_tech || d.id, d]));

		for (const id of order) {
			const item = dataMap.get(id);
			if (item) {
				ordered.push(item);
			}
		}

		instance.data = ordered;
		return instance;
	}

	/**
	 * Filter data by a predicate function
	 *
	 * @param {(item: any) => boolean} predicate
	 * @returns {StatisticV2}
	 */
	filter(predicate) {
		const instance = this._getInstance();
		instance.data = instance.data.filter(predicate);
		return instance;
	}

	/**
	 * Map/transform each data item
	 *
	 * @param {(item: any) => any} mapper
	 * @returns {StatisticV2}
	 */
	map(mapper) {
		const instance = this._getInstance();
		instance.data = instance.data.map(mapper);
		return instance;
	}

	/**
	 * Get the processed data
	 * @returns {any[]}
	 */
	getData() {
		return this.data;
	}

	/**
	 * Get series names (IDs) from the data
	 * @returns {string[]}
	 */
	getSeriesNames() {
		return this.data.map((d) => d.fuel_tech || d.id);
	}

	/**
	 * Convert to plain object for serialization
	 */
	toJSON() {
		return {
			data: this.data,
			statsType: this.statsType,
			unit: this.unit,
			minInterval: this.minInterval
		};
	}
}
