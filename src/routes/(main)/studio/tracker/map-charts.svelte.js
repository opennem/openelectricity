/**
 * Data factory for the map view's on-anchor mini charts.
 *
 * Two requests cover all seven charts (six regions plus the docked
 * All-Australia card): one region-grouped NEM fetch
 * (`primary_grouping=network_region` splits every region's series in a single
 * response) plus one WEM fetch, with the national series summed client-side
 * from both. Fixed rolling window — the last 24 hours at
 * native 5m, display-aggregated to 30m by `miniSeriesForRegion` — refreshed by
 * the page whenever the grid-live dispatch snapshot ticks. Stale responses are
 * dropped by a sequence guard; a failed refresh keeps the previous charts.
 */

import { nemNaiveRange } from '$lib/flows/nem-time.js';
import { miniSeriesForAu, miniSeriesForRegion } from './map-minis.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const NEM_MINI_CODES = ['NSW1', 'QLD1', 'SA1', 'TAS1', 'VIC1'];

/**
 * @param {string} region - route region value ('_all' | 'wem')
 * @param {'power' | 'price' | 'emissions'} metric
 * @param {string} tz - network offset string
 * @param {boolean} grouped - split per region in one response
 */
function buildUrl(region, metric, tz, grouped) {
	// nemNaiveRange keeps full datetime precision — toNetworkDateString would
	// snap the rolling window to midnight and serve yesterday's calendar day.
	const { dateStart, dateEnd } = nemNaiveRange(DAY_MS, tz);
	// Values are all URL-safe literals — no URLSearchParams needed (and the
	// svelte-reactivity lint would want the reactive variant in a .svelte.js).
	const params = [
		`region=${region}`,
		`metric=${metric}`,
		'interval=5m',
		`date_start=${dateStart}`,
		`date_end=${dateEnd}`,
		...(grouped ? ['primary_grouping=network_region'] : [])
	].join('&');
	return `/api/network/data?${params}`;
}

/**
 * @returns {{
 *   readonly charts: Record<string, ReturnType<typeof miniSeriesForRegion>>,
 *   readonly isLoading: boolean,
 *   readonly loadedMetric: 'power' | 'price' | 'emissions' | null,
 *   load: (metric: 'power' | 'price' | 'emissions', dispatchTick?: string) => Promise<void>
 * }}
 */
export function createMapCharts() {
	/** @type {Record<string, ReturnType<typeof miniSeriesForRegion>>} */
	let charts = $state.raw({});
	let isLoading = $state(false);
	/** The metric the held charts were processed for — stays on the OLD metric
	 *  until a switch's data lands, so callers can gate on
	 *  `selected !== loadedMetric` to show a loading state on switches without
	 *  flashing one on the routine same-metric dispatch refreshes.
	 *  @type {'power' | 'price' | 'emissions' | null} */
	let loadedMetric = $state(null);
	let seq = 0;
	/** Last successfully loaded (metric, dispatch tick) — a panel⇄map toggle
	 *  with neither changed skips the refetch entirely. */
	let lastLoadKey = '';

	/** @param {string} url */
	async function fetchResponse(url) {
		try {
			const res = await fetch(url);
			if (!res.ok) return null;
			const json = await res.json();
			return json?.response ?? null;
		} catch {
			return null;
		}
	}

	/** @param {'power' | 'price' | 'emissions'} metric @param {string} [dispatchTick] */
	async function load(metric, dispatchTick = '') {
		const key = `${metric}|${dispatchTick}`;
		if (key === lastLoadKey) return;
		const mySeq = ++seq;
		isLoading = true;
		const [nem, wem] = await Promise.all([
			fetchResponse(buildUrl('_all', metric, '+10:00', true)),
			fetchResponse(buildUrl('wem', metric, '+08:00', false))
		]);
		if (mySeq !== seq) return;

		/** @type {Record<string, ReturnType<typeof miniSeriesForRegion>>} */
		const next = {};
		if (nem) {
			for (const code of NEM_MINI_CODES) {
				next[code] = miniSeriesForRegion(nem, { metric, region: code });
			}
		}
		if (wem) {
			next.WEM = miniSeriesForRegion(wem, {
				metric,
				region: null,
				networkTimezone: '+08:00',
				ianaTimeZone: 'Australia/Perth'
			});
		}
		// National sum from the same two responses — zero extra requests. Null
		// for price (no national price exists); the docked card hides instead.
		if (nem) {
			const au = miniSeriesForAu(nem, wem, { metric });
			if (au) next.AU = au;
		}

		// A failed refresh keeps the previous charts (and their metric) rather
		// than blanking the map — a later dispatch tick retries.
		if (Object.values(next).some(Boolean)) {
			charts = next;
			loadedMetric = metric;
			lastLoadKey = key;
		}
		isLoading = false;
	}

	return {
		get charts() {
			return charts;
		},
		get isLoading() {
			return isLoading;
		},
		get loadedMetric() {
			return loadedMetric;
		},
		load
	};
}
