<script>
	/**
	 * FacilityCurtailmentPanel — regional curtailment context for /facility/[code].
	 *
	 * The OE API publishes curtailment only as a network market metric, split by
	 * fuel tech and aggregated per region; there is no per-facility or per-unit
	 * series. So this panel shows the *region's* curtailment for the facility's
	 * own fuel tech — it is context, not this facility's lost output. The region
	 * badge carries that at a glance; the heading's tooltip spells it out and
	 * links to the OE curtailment guide. See `./scope.js` for the scoping rules
	 * (NEM only, wind and utility solar only) and `network/market-metrics.js` for
	 * the metric mapping and series presentation.
	 *
	 * Renders nothing when the facility has no applicable curtailment split, so
	 * the page can mount it unconditionally.
	 *
	 * Viewport: `NetworkChart` owns its viewport internally (like the generation
	 * chart, unlike the derived-rate providers), so this panel re-exports the
	 * imperative surface the range controller drives — `setViewport` and
	 * `reconcileFetches`. The page lists it in the controller's `charts`, which
	 * owns the echo suppression for every chart at once; gestures here report
	 * back through `onviewportchange` / `onviewportsettle`.
	 *
	 * The panel is a `ChartCard` like its siblings: the page hands it the
	 * card's `download` and `compare`, the comparison's `timeMarkers` and
	 * `onpick` (a click picks A / B instead of pinning), and reads what it draws
	 * through `onvisibledata`.
	 */

	import NetworkChart from '$lib/components/charts/network/NetworkChart.svelte';
	import ChartCard from '$lib/components/charts/card/ChartCard.svelte';
	import { curtailmentMetric } from '$lib/components/charts/network/market-metrics.js';
	import {
		facilityCurtailmentScope,
		hiddenCurtailmentSeries,
		CURTAILMENT_DOCS_HREF
	} from './scope.js';

	/**
	 * @typedef {Object} Props
	 * @property {any} facility
	 * @property {string} timeZone - Network offset string ('+10:00')
	 * @property {'power' | 'energy'} basis - Chart basis, laddered with the interval
	 * @property {string} interval - Native OE interval
	 * @property {string} displayInterval - Display interval for aggregation
	 * @property {number} viewStart
	 * @property {number} viewEnd
	 * @property {import('svelte').ComponentProps<typeof ChartCard>['download']} [download]
	 * @property {import('svelte').ComponentProps<typeof ChartCard>['compare']} [compare]
	 * @property {{markers: Array<{id: string, time: number, label: string}>, armed?: string | null, band?: boolean} | null} [timeMarkers]
	 * @property {(time: number) => void} [onpick]
	 * @property {(snapshot: import('$lib/components/charts/card/types.js').ChartSnapshot) => void} [onvisibledata]
	 * @property {number | undefined} [hoverTime]
	 * @property {((time: number | undefined) => void)} [onhoverchange]
	 * @property {((range: { start: number, end: number }) => void)} [onviewportchange]
	 * @property {((range: { start: number, end: number }) => void)} [onviewportsettle]
	 * @property {string[]} [hiddenUnitCodes] - Units toggled off in the units panel;
	 *   a split whose units are all hidden drops out of the chart
	 * @property {boolean} [panZoomEngaged]
	 */

	/** @type {Props} */
	let {
		facility,
		timeZone,
		basis,
		interval,
		displayInterval,
		viewStart,
		viewEnd,
		download,
		compare,
		timeMarkers = null,
		onpick,
		onvisibledata,
		hoverTime = undefined,
		onhoverchange,
		onviewportchange,
		onviewportsettle,
		hiddenUnitCodes = [],
		panZoomEngaged = $bindable(false)
	} = $props();

	let scope = $derived(facilityCurtailmentScope(facility));
	let hiddenSeriesNames = $derived(hiddenCurtailmentSeries(facility, hiddenUnitCodes));

	/** @type {NetworkChart | undefined} */
	let chart = $state(undefined);

	// The imperative surface the range controller drives, forwarded to the chart.
	// No-ops before the chart mounts (no scope, or no viewport yet), which is the
	// same contract the controller already tolerates for the generation chart.

	/** @param {number} startMs @param {number} endMs */
	export function setViewport(startMs, endMs) {
		chart?.setViewport(startMs, endMs);
	}

	export function reconcileFetches() {
		chart?.reconcileFetches();
	}
</script>

{#if scope}
	<ChartCard
		title={scope.label}
		info={{ text: scope.note, href: CURTAILMENT_DOCS_HREF }}
		badge={scope.regionName}
		engaged={panZoomEngaged}
		heightStorageKey="facility-chart-height-curtailment"
		defaultHeightPx={160}
		{download}
		{compare}
	>
		{#snippet children(heightPx)}
			{#if viewStart && viewEnd}
				<NetworkChart
					bind:this={chart}
					region={scope.region}
					metric={curtailmentMetric(scope.kind, basis)}
					{interval}
					{displayInterval}
					{timeZone}
					title="Curtailment"
					chartHeightPx={heightPx}
					showContainer={false}
					tooltipMode="floating"
					{hoverTime}
					{hiddenSeriesNames}
					{onhoverchange}
					{onviewportchange}
					{onviewportsettle}
					{onvisibledata}
					{timeMarkers}
					engageOnTap={!onpick}
					onfocuschange={onpick && ((time) => time !== undefined && onpick(time))}
					panZoomMode="tap-to-engage"
					bind:panZoomEngaged
				/>
			{/if}
		{/snippet}
	</ChartCard>
{/if}
