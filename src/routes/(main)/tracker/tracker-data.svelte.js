import { networkQueryKey } from '$lib/components/charts/network/network-query.js';

/** @typedef {'generation' | 'market' | 'emissions'} ChartKey */
/** @typedef {import('./types.js').GenerationSnapshot} Snapshot */

/** Query-aware publication. Held frames are for presentation only; consumers
 * accept data only when its producer identity matches the requested query.
 * @param {{session: ReturnType<typeof import('./tracker-session.svelte.js').createTrackerSession>,
 * priceMetric: () => string, emissionsMetric: () => string, hidden: () => string[],
 * charts: () => Array<{getQueryState: () => {key: string, pending: boolean, error: string | null}} | undefined>}} opts
 */
export function createTrackerData(opts) {
	/** @type {Partial<Record<ChartKey, Snapshot>>} */
	let snapshots = $state.raw({});
	const names = /** @type {const} */ (['generation', 'market', 'emissions']);
	/** @param {ChartKey} name */
	function queryKey(name) {
		const { region, group, bucketFilter } = opts.session.selection;
		return networkQueryKey({
			region,
			group,
			bucketFilter,
			...opts.session.window,
			metric:
				name === 'generation'
					? opts.session.range.activeMetric
					: name === 'market'
						? opts.priceMetric()
						: opts.emissionsMetric(),
			interval: opts.session.range.activeInterval,
			displayInterval: opts.session.range.displayInterval,
			excludedGroups:
				name === 'emissions' && opts.emissionsMetric() === 'emissions_intensity'
					? opts.hidden()
					: []
		});
	}
	/** @param {ChartKey} name */
	function state(name) {
		const value = opts.charts()[names.indexOf(name)]?.getQueryState();
		if (!value || value.key !== queryKey(name)) return { pending: true, error: null };
		return value;
	}
	/** @param {ChartKey} name */
	function current(name) {
		const snapshot = snapshots[name];
		return snapshot?.queryKey === queryKey(name) ? snapshot : null;
	}
	return {
		queryKey,
		state,
		current,
		/** @param {ChartKey} name @param {Snapshot} snapshot */
		publish(name, snapshot) {
			if (snapshot.queryKey !== queryKey(name)) return;
			snapshots = { ...snapshots, [name]: snapshot };
		},
		/** @param {ChartKey} name */
		ready(name) {
			const status = state(name);
			return !status.pending && !status.error && current(name) !== null;
		},
		get settled() {
			return names.every((name) => !state(name).pending);
		},
		get failed() {
			return names.some((name) => state(name).error);
		}
	};
}
