/** @typedef {'generation' | 'market' | 'emissions' | 'demand' | 'renewables'} MetricId */
/** @typedef {{ pending: boolean, error: string | null }} MetricStatus */

/** The window-metrics feed: per-metric readiness and the accepted inputs
 * behind the metrics pane. Chart metrics come from accepted, query-matching
 * snapshots; demand and renewables from the table's providers, at the same
 * display grain as the charts.
 * @param {{session: ReturnType<typeof import('./tracker-session.svelte.js').createTrackerSession>,
 * data: ReturnType<typeof import('./tracker-data.svelte.js').createTrackerData>,
 * providers: ReturnType<typeof import('./tracker-providers.svelte.js').createTrackerProviders>,
 * table: ReturnType<typeof import('./tracker-table.svelte.js').createTrackerTable>,
 * hidden: () => string[],
 * priceMetric: () => import('./types.js').TrackerExportContext['priceMetric'],
 * emissionsMetric: () => import('./types.js').TrackerExportContext['emissionsMetric'],
 * holdFrame: () => boolean}} opts - `holdFrame` is true while the charts veil a stale frame */
export function createTrackerMetrics(opts) {
	const { session, data, providers, table } = opts;
	const chartMetrics = /** @type {const} */ (['generation', 'market', 'emissions']);
	const providerMetrics = /** @type {const} */ (['demand', 'renewables']);
	/** @param {'demand' | 'renewables'} id */
	const providerFor = (id) => (id === 'demand' ? providers.demandData : providers.renewablesSource);
	/** Nothing is ready while the charts hold a frame or a gesture is in flight. */
	let held = $derived(opts.holdFrame() || session.gestureActive);
	let status = $derived(
		/** @type {Record<MetricId, MetricStatus>} */ (
			Object.fromEntries([
				...chartMetrics.map((id) => {
					const { error } = data.state(id);
					return [id, { error, pending: !error && (held || !data.ready(id)) }];
				}),
				...providerMetrics.map((id) => {
					const { error, isPending } = providerFor(id);
					return [id, { error, pending: !error && (held || isPending) }];
				})
			])
		)
	);
	/** @param {MetricId} id */
	const available = (id) => !status[id].pending && !status[id].error;
	let window = $derived(session.window);
	let input = $derived({
		generation: available('generation') ? data.current('generation') : null,
		market: available('market') ? data.current('market') : null,
		emissions: available('emissions') ? data.current('emissions') : null,
		demand: available('demand')
			? {
					data: providers.demandData.getDisplayRows(window.start, window.end, table.displayRowOpts),
					start: window.start,
					end: window.end,
					seriesNames: ['demand']
				}
			: null,
		renewables: available('renewables')
			? {
					data: providers.renewableShareRows(window.start, window.end, table.shareRowOpts),
					start: window.start,
					end: window.end,
					seriesNames: ['renewable_share']
				}
			: null,
		hidden: opts.hidden(),
		basis: session.range.activeMetric,
		priceMetric: opts.priceMetric(),
		emissionsMetric: opts.emissionsMetric()
	});
	return {
		get status() {
			return status;
		},
		get input() {
			return input;
		},
		/** Only the provider-backed metrics retry here; charts retry through their cards.
		 * @param {string} id */
		retry(id) {
			if (id === 'demand' || id === 'renewables') providerFor(id).reconcileFetches();
		}
	};
}
