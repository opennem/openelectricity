/**
 * Shared loading-state predicates for charts fed by a ChartDataManager.
 * Pure — callers wrap them in their own $derived.
 *
 * @typedef {import('./ChartDataManager.svelte.js').default} ManagerLike
 * @typedef {{ seriesData: any[] }} StoreLike
 */

/**
 * A range/interval switch swapped in a fresh manager while the previous
 * chart's pixels are still up — keep the stale frame visible under the
 * loading veil instead of flashing to empty.
 *
 * @param {ManagerLike | null} manager
 * @param {StoreLike | null} store
 * @returns {boolean}
 */
export function isSwitchingData(manager, store) {
	if (!manager || !store) return false;
	return !manager.initialLoadComplete && store.seriesData.length > 0;
}

/**
 * Show the loading overlay while switching data, or when the chart has no
 * visible data and a fetch is pending or in flight.
 *
 * @param {ManagerLike | null} manager
 * @param {StoreLike | null} store
 * @returns {boolean}
 */
export function showLoadingOverlay(manager, store) {
	if (!manager || !store) return false;
	if (isSwitchingData(manager, store)) return true;
	if (store.seriesData.length > 0) return false;
	return !manager.initialLoadComplete || manager.isLoading || manager.hasPendingFetch;
}
