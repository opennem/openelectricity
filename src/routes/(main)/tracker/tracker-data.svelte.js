import { networkQueryKey } from '$lib/components/charts/network/network-query.js';

/** @typedef {import('./types.js').TimelineCard} ChartKey */
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
	/** Each held snapshot's series identity (`seriesKey` when published). */
	/** @type {Partial<Record<ChartKey, string>>} */
	let identities = $state.raw({});
	const names = /** @type {const} */ (['generation', 'market', 'emissions']);
	/** @param {ChartKey} name */
	function queryKey(name) {
		return keyFor(name, opts.session.window);
	}
	/** The chart's query without its window: what a snapshot shows, wherever
	 * the reader has panned to.
	 * @param {ChartKey} name */
	function seriesKey(name) {
		return keyFor(name, { start: 0, end: 0 });
	}
	/** @param {ChartKey} name @param {{start: number, end: number}} window */
	function keyFor(name, window) {
		const { region, group, bucketFilter } = opts.session.selection;
		return networkQueryKey({
			region,
			group,
			bucketFilter,
			...window,
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
	/** The latest snapshot of the chart's series, from this window or an
	 * earlier one (a pan away): null once the region, grouping, metric,
	 * interval or filter changes. Comparisons read it, so a pan never blanks
	 * them; everything that must match the window reads `current`.
	 * @param {ChartKey} name */
	function latest(name) {
		return identities[name] === seriesKey(name) ? (snapshots[name] ?? null) : null;
	}
	return {
		queryKey,
		seriesKey,
		state,
		current,
		latest,
		/** @param {ChartKey} name @param {Snapshot} snapshot */
		publish(name, snapshot) {
			if (snapshot.queryKey !== queryKey(name)) return;
			snapshots = { ...snapshots, [name]: snapshot };
			identities = { ...identities, [name]: seriesKey(name) };
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
