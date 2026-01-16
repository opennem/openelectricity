/**
 * Chart Synchronization Helpers
 *
 * Utilities for synchronizing interactions across multiple charts.
 * Enables coordinated hover, focus, and other interactions.
 */

import ChartStore from './ChartStore.svelte.js';

/**
 * @typedef {Object} SyncedChartsController
 * @property {ChartStore[]} charts - Array of synchronized chart stores
 * @property {(time: number | undefined, key?: string) => void} setHover - Set hover on all charts
 * @property {() => void} clearHover - Clear hover on all charts
 * @property {(time: number) => void} toggleFocus - Toggle focus on all charts
 * @property {() => void} clearFocus - Clear focus on all charts
 * @property {() => void} resetAll - Reset all interaction states
 * @property {(chart: ChartStore) => void} addChart - Add a chart to the sync group
 * @property {(chart: ChartStore) => void} removeChart - Remove a chart from the sync group
 * @property {() => void} destroy - Remove all charts and clean up
 */

/**
 * Create a controller for synchronized chart interactions
 *
 * @param {ChartStore[]} initialCharts - Array of ChartStore instances to synchronize
 * @returns {SyncedChartsController}
 *
 * @example
 * const chart1 = new ChartStore({ key: Symbol('power') });
 * const chart2 = new ChartStore({ key: Symbol('energy') });
 * const sync = createSyncedCharts([chart1, chart2]);
 *
 * // Hover events sync across both charts
 * sync.setHover(1234567890, 'solar');
 */
export function createSyncedCharts(initialCharts) {
	/** @type {ChartStore[]} */
	let charts = [...initialCharts];

	return {
		get charts() {
			return charts;
		},

		/**
		 * Add a chart to the sync group
		 * @param {ChartStore} chart
		 */
		addChart(chart) {
			if (!charts.includes(chart)) {
				charts.push(chart);
			}
		},

		/**
		 * Remove a chart from the sync group
		 * @param {ChartStore} chart
		 */
		removeChart(chart) {
			const index = charts.indexOf(chart);
			if (index !== -1) {
				charts.splice(index, 1);
			}
		},

		/**
		 * Remove all charts and clean up
		 */
		destroy() {
			charts = [];
		},

		/**
		 * Set hover state on all charts
		 * @param {number | undefined} time
		 * @param {string} [key]
		 */
		setHover(time, key) {
			for (const chart of charts) {
				chart.setHover(time, key);
			}
		},

		/**
		 * Clear hover state on all charts
		 */
		clearHover() {
			for (const chart of charts) {
				chart.clearHover();
			}
		},

		/**
		 * Toggle focus on all charts
		 * @param {number} time
		 */
		toggleFocus(time) {
			for (const chart of charts) {
				chart.toggleFocus(time);
			}
		},

		/**
		 * Clear focus on all charts
		 */
		clearFocus() {
			for (const chart of charts) {
				chart.clearFocus();
			}
		},

		/**
		 * Reset all interaction states on all charts
		 */
		resetAll() {
			for (const chart of charts) {
				chart.resetInteractions();
			}
		}
	};
}

/**
 * Create a hover handler that syncs across charts
 *
 * @param {ChartStore[]} charts - Charts to synchronize
 * @returns {(time: number | undefined, key?: string) => void}
 *
 * @example
 * const handleHover = createSyncedHoverHandler([chart1, chart2]);
 * // Use in component: onmousemove={() => handleHover(dataPoint.time)}
 */
export function createSyncedHoverHandler(charts) {
	return (time, key) => {
		for (const chart of charts) {
			chart.setHover(time, key);
		}
	};
}

/**
 * Create a focus handler that syncs across charts
 *
 * @param {ChartStore[]} charts - Charts to synchronize
 * @returns {(time: number) => void}
 *
 * @example
 * const handleFocus = createSyncedFocusHandler([chart1, chart2]);
 * // Use in component: onclick={() => handleFocus(dataPoint.time)}
 */
export function createSyncedFocusHandler(charts) {
	return (time) => {
		for (const chart of charts) {
			chart.toggleFocus(time);
		}
	};
}

/**
 * Create a clear handler for hover states
 *
 * @param {ChartStore[]} charts - Charts to synchronize
 * @returns {() => void}
 */
export function createSyncedClearHoverHandler(charts) {
	return () => {
		for (const chart of charts) {
			chart.clearHover();
		}
	};
}

/**
 * Sync data transform type across charts
 *
 * @param {ChartStore[]} charts
 * @param {import('./ChartOptions.svelte.js').DataTransformType} type
 */
export function syncDataTransformType(charts, type) {
	for (const chart of charts) {
		if (chart.chartOptions) {
			chart.chartOptions.selectedDataTransformType = type;
		}
	}
}

/**
 * Sync chart type across charts
 *
 * @param {ChartStore[]} charts
 * @param {import('./ChartOptions.svelte.js').ChartType} type
 */
export function syncChartType(charts, type) {
	for (const chart of charts) {
		if (chart.chartOptions) {
			chart.chartOptions.selectedChartType = type;
		}
	}
}

/**
 * Sync curve type across charts
 *
 * @param {ChartStore[]} charts
 * @param {import('./ChartOptions.svelte.js').CurveType} type
 */
export function syncCurveType(charts, type) {
	for (const chart of charts) {
		if (chart.chartOptions) {
			chart.chartOptions.selectedCurveType = type;
		}
	}
}
