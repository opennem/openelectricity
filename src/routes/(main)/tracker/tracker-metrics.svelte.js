import { getIntervalHours } from '$lib/components/charts/facility/interval-hours.js';
import { selectIntensityComponents } from '$lib/components/charts/network/process-emissions-intensity.js';
/** @typedef {'generation' | 'energy' | 'market' | 'emissions' | 'intensity' | 'demand' | 'renewables'
 * | 'curtailment_solar' | 'curtailment_wind'} MetricId */
/** @typedef {{ pending: boolean, error: string | null }} MetricStatus */

/** The window-metrics feed: per-metric readiness and the accepted inputs
 * behind the metrics strip. Chart metrics come from accepted, query-matching
 * snapshots; demand, renewables and the emissions pair from headless providers,
 * at the same display grain as the charts.
 * @param {{session: ReturnType<typeof import('./tracker-session.svelte.js').createTrackerSession>,
 * data: ReturnType<typeof import('./tracker-data.svelte.js').createTrackerData>,
 * providers: ReturnType<typeof import('./tracker-providers.svelte.js').createTrackerProviders>,
 * table: ReturnType<typeof import('./tracker-table.svelte.js').createTrackerTable>,
 * hidden: () => string[],
 * priceMetric: () => import('./types.js').TrackerExportContext['priceMetric'],
 * holdFrame: () => boolean}} opts - `holdFrame` is true while the charts veil a stale frame */
export function createTrackerMetrics(opts) {
	const { session, data, providers, table } = opts;
	const chartMetrics = /** @type {const} */ (['generation', 'market']);
	const providerMetrics = /** @type {const} */ ([
		'demand',
		'renewables',
		'emissions',
		'intensity',
		'curtailment_solar',
		'curtailment_wind'
	]);
	/** @param {Exclude<MetricId, 'generation' | 'energy' | 'market'>} id */
	const providerFor = (id) =>
		id === 'demand'
			? providers.demandData
			: id === 'renewables'
				? providers.renewablesSource
				: id === 'emissions' || id === 'intensity'
					? providers.intensityData
					: providers.curtailmentData;
	/** Nothing is ready while the charts hold a frame or a gesture is in flight. */
	let held = $derived(opts.holdFrame() || session.gestureActive);
	/** @param {'generation' | 'market'} id @returns {MetricStatus} */
	const chartStatus = (id) => {
		const { error } = data.state(id);
		return { error, pending: !error && (held || !data.ready(id)) };
	};
	let status = $derived(
		/** @type {Record<MetricId, MetricStatus>} */ (
			Object.fromEntries([
				...chartMetrics.map((id) => [id, chartStatus(id)]),
				// Net energy reads the generation chart's snapshot.
				['energy', chartStatus('generation')],
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
		// Emissions volume and intensity share the components feed, collapsed to
		// the visible technologies the way the intensity chart does.
		emissions: available('emissions')
			? {
					data: selectIntensityComponents(
						{
							seriesNames: providers.intensityData.seriesMeta?.seriesNames ?? [],
							data: providers.intensityData.getDisplayRows(window.start, window.end, {
								...table.displayRowOpts,
								method: 'sum'
							})
						},
						opts.hidden()
					).data,
					start: window.start,
					end: window.end,
					seriesNames: ['emissions', 'energy_mwh']
				}
			: null,
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
		curtailment: available('curtailment_solar')
			? {
					data: providers.curtailmentData.getDisplayRows(
						window.start,
						window.end,
						table.displayRowOpts
					),
					start: window.start,
					end: window.end,
					seriesNames: ['curtailment_solar', 'curtailment_wind']
				}
			: null,
		hidden: opts.hidden(),
		basis: session.range.activeMetric,
		bucketHours: (/** @type {number} */ time) =>
			getIntervalHours(session.range.displayInterval, time, session.ianaTimeZone),
		priceMetric: opts.priceMetric()
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
			if (id !== 'generation' && id !== 'energy' && id !== 'market')
				providerFor(
					/** @type {Exclude<MetricId, 'generation' | 'energy' | 'market'>} */ (id)
				).reconcileFetches();
		}
	};
}
