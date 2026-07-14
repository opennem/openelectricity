/**
 * LRU stash of warm ChartDataManagers.
 *
 * Owners swap managers when interval/metric/series settings change; stashing
 * the outgoing manager keeps its processed cache alive so switching back
 * revives it instantly instead of refetching. Map insertion order doubles as
 * LRU order — entries leave the map while live (taken on revival, re-stashed
 * on the next swap). Evicted and cleared managers are dispose()d, which
 * cancels their pending work but keeps the cache intact by design (a disposed
 * manager can still be revived — see ChartDataManager.dispose).
 */

/**
 * @typedef {{ dispose: () => void }} Disposable
 */

/**
 * Stash key for a manager's grain + series identity — the single home for the
 * key scheme, so the stash/take/has call sites in different owners can't
 * drift. The data-source identity (cacheKey) is deliberately excluded:
 * owners clear the stash when the source changes.
 *
 * @param {string} interval
 * @param {string} metric
 * @param {string} seriesKey
 * @returns {string}
 */
export function managerKey(interval, metric, seriesKey) {
	return `${interval}|${metric}|${seriesKey}`;
}

/**
 * @param {{ max?: number }} [options]
 */
export function createManagerStash({ max = 4 } = {}) {
	/** @type {Map<string, any>} */
	const stashed = new Map();

	return {
		/**
		 * Remove and return the manager stashed under `key`, if any.
		 * @param {string} key
		 * @returns {any | undefined}
		 */
		take(key) {
			const manager = stashed.get(key);
			if (manager) stashed.delete(key);
			return manager;
		},

		/**
		 * @param {string} key
		 * @returns {boolean}
		 */
		has(key) {
			return stashed.has(key);
		},

		/**
		 * Stash a manager under `key`, refreshing its recency; the oldest entry
		 * beyond the capacity is disposed and dropped.
		 * @param {string} key
		 * @param {Disposable} manager
		 */
		stash(key, manager) {
			stashed.delete(key);
			stashed.set(key, manager);
			while (stashed.size > max) {
				const oldest = /** @type {string} */ (stashed.keys().next().value);
				stashed.get(oldest)?.dispose();
				stashed.delete(oldest);
			}
		},

		/** Dispose and drop every stashed manager. */
		clear() {
			for (const manager of stashed.values()) manager.dispose();
			stashed.clear();
		}
	};
}
