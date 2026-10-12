/**
 * A chart header host: a container (the tracker's chart cards) that draws a
 * StratumChart's toolbar — its title, unit, options menu and pan/zoom
 * buttons — in its own header, instead of the chart's grey `ChartHeader`
 * bar. The container creates a host and sets it in context; a StratumChart
 * inside it that would show the default header hands over its header props
 * while mounted and draws no bar of its own.
 *
 * The handed-over props are getters, so the host's header always reads the
 * chart as it is now.
 */

import { getContext, setContext, untrack } from 'svelte';

/**
 * @typedef {{
 *   chart: import('./ChartStore.svelte.js').default,
 *   showOptions: boolean,
 *   onzoomin?: () => void,
 *   onzoomout?: () => void,
 *   isAtMinZoom: boolean,
 *   isAtMaxZoom: boolean,
 *   showPanZoomToggle: boolean,
 *   panZoomEngaged: boolean,
 *   onpanzoomtoggle: () => void
 * }} HostedChartHeader
 */

const KEY = Symbol('chart-header-host');

export function createChartHeaderHost() {
	let hosted = $state.raw(/** @type {HostedChartHeader | null} */ (null));
	return {
		/** The hosted chart's header, or null when no chart hands one over. */
		get current() {
			return hosted;
		},
		/**
		 * Draw a chart's header until the returned cleanup runs. One chart per
		 * host: the latest to mount wins, and a stale cleanup leaves it alone.
		 * @param {HostedChartHeader} header
		 */
		host(header) {
			hosted = header;
			return () => {
				if (untrack(() => hosted) === header) hosted = null;
			};
		}
	};
}

/** @typedef {ReturnType<typeof createChartHeaderHost>} ChartHeaderHost */

/** @param {ChartHeaderHost} host */
export function setChartHeaderHost(host) {
	return setContext(KEY, host);
}

/** The enclosing host, or null: the chart draws its own header. */
export function getChartHeaderHost() {
	return /** @type {ChartHeaderHost | undefined} */ (getContext(KEY)) ?? null;
}
