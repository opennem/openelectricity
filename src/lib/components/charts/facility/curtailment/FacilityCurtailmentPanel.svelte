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
	 * chart, unlike the derived-rate providers), so the page's range is mirrored
	 * in imperatively and gestures are reported back out through
	 * `onviewportchange` / `onviewportsettle`.
	 */

	import { untrack } from 'svelte';
	import { Info } from '@lucide/svelte';
	import NetworkChart from '$lib/components/charts/network/NetworkChart.svelte';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import { curtailmentMetric } from '$lib/components/charts/network/market-metrics.js';
	import { facilityCurtailmentScope, CURTAILMENT_DOCS_HREF } from './scope.js';

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
	 * @property {number} [reconcileSeq] - Bumped by the range control when a peer gesture settles
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
		reconcileSeq = 0,
		panZoomEngaged = $bindable(false)
	} = $props();

	let scope = $derived(facilityCurtailmentScope(facility));

	/** @type {NetworkChart | undefined} */
	let chart = $state(undefined);

	/** Last range mirrored into (or reported by) the chart. Plain object, not
	 *  `$state` — it's bookkeeping to break the push/echo cycle, and making it
	 *  reactive would re-run the mirroring effect on every write. Reset when the
	 *  chart goes away so a remount is never skipped by a stale match (retired
	 *  facilities can produce byte-identical ranges across navigations). */
	let applied = { start: 0, end: 0 };

	// Mirror the page's viewport down. `NetworkChart` owns its viewport
	// internally, so this is the only thing that gives it one — no `dateStart`
	// seed, which would fetch a default window before the page's real range is
	// known and then throw it away on the first push.
	$effect(() => {
		const start = viewStart;
		const end = viewEnd;
		const c = chart;
		if (!c) {
			applied = { start: 0, end: 0 };
			return;
		}
		if (!start || !end) return;
		if (applied.start === start && applied.end === end) return;
		applied = { start, end };
		c.setViewport(start, end);
	});

	// A gesture settled on a peer chart: prune this chart's now-stale in-flight
	// fetches. Mirrors how the derived providers consume `reconcileSeq` — the
	// seq dedupe plus `untrack` keeps it from firing on mount or on an unrelated
	// chart-identity change.
	let lastReconcileSeq = 0;
	$effect(() => {
		const seq = reconcileSeq;
		if (seq === lastReconcileSeq) return;
		lastReconcileSeq = seq;
		untrack(() => chart?.reconcileFetches());
	});

	/** @param {{ start: number, end: number }} range */
	function handleViewportChange(range) {
		// Ignore the chart echoing back a viewport we just pushed into it —
		// forwarding it would re-enter the range controller, which is not
		// echo-guarded on this path and would push the range into the generation
		// chart mid-gesture. A clamped (genuinely different) range still reports.
		if (applied.start === range.start && applied.end === range.end) return;
		applied = { start: range.start, end: range.end };
		onviewportchange?.(range);
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
				{onhoverchange}
				onviewportchange={handleViewportChange}
				{onviewportsettle}
				panZoomMode="tap-to-engage"
				bind:panZoomEngaged
			/>
		{/if}
	</section>
{/if}
