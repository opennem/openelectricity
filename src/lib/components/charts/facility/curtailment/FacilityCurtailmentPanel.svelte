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
	 */

	import { Info } from '@lucide/svelte';
	import NetworkChart from '$lib/components/charts/network/NetworkChart.svelte';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
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
	 * @property {string} [cardClass] - Section card chrome from the page
	 * @property {string} [chartHeight]
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
		cardClass = '',
		chartHeight = 'h-[160px]',
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
	<section class={cardClass}>
		<div class="flex items-center justify-between gap-4 px-6 pb-1 pt-4">
			<h3 class="m-0 text-sm font-semibold text-dark-grey">
				<Tooltip
					text={scope.note}
					learnMoreHref={CURTAILMENT_DOCS_HREF}
					class="inline-flex cursor-help items-center gap-1"
				>
					{scope.label}
					<Info class="size-4.5 text-mid-grey" />
				</Tooltip>
			</h3>
			<span class="px-2 py-0.5 rounded bg-dark-grey text-white text-xs">
				{scope.regionName}
			</span>
		</div>

		{#if viewStart && viewEnd}
			<NetworkChart
				bind:this={chart}
				region={scope.region}
				metric={curtailmentMetric(scope.kind, basis)}
				{interval}
				{displayInterval}
				{timeZone}
				title="Curtailment"
				{chartHeight}
				showContainer={false}
				tooltipMode="floating"
				{hoverTime}
				{hiddenSeriesNames}
				{onhoverchange}
				{onviewportchange}
				{onviewportsettle}
				panZoomMode="tap-to-engage"
				bind:panZoomEngaged
			/>
		{/if}
	</section>
{/if}
