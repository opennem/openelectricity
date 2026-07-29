<script>
	/**
	 * FacilityCurtailmentPanel — regional curtailment context for /facility/[code].
	 *
	 * The OE API publishes curtailment only as a network market metric, split by
	 * fuel tech and aggregated per region; there is no per-facility or per-unit
	 * series. So this panel shows the *region's* curtailment for the facility's
	 * own fuel tech — it is context, not this facility's lost output. The region
	 * badge carries that at a glance; the heading's tooltip spells it out and
	 * links to the OE curtailment guide. See `$lib/facilities/curtailment.js` for
	 * the scoping rules (NEM only, wind and utility solar only) and
	 * `market-metrics.js` for the series presentation.
	 *
	 * Renders nothing when the facility has no applicable curtailment split, so
	 * the page can mount it unconditionally.
	 *
	 * Viewport: `NetworkChart` owns its viewport internally (like the generation
	 * chart, unlike the derived-rate providers), so the page's range is mirrored
	 * in imperatively and gestures are reported back out through
	 * `onviewportchange` / `onviewportsettle`.
	 */

	import { Info } from '@lucide/svelte';
	import NetworkChart from '$lib/components/charts/network/NetworkChart.svelte';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import {
		facilityCurtailmentScope,
		curtailmentMetric,
		CURTAILMENT_DOCS_HREF
	} from '$lib/facilities/curtailment.js';

	/**
	 * @typedef {Object} Props
	 * @property {any} facility
	 * @property {string} timeZone - Network offset string ('+10:00')
	 * @property {'power' | 'energy'} basis - Chart basis, laddered with the interval
	 * @property {string} interval - Native OE interval
	 * @property {string} displayInterval - Display interval for aggregation
	 * @property {number} viewStart
	 * @property {number} viewEnd
	 * @property {string} [dateStart] - Initial viewport start (before the first push)
	 * @property {string} [dateEnd] - Initial viewport end
	 * @property {string} [cardClass] - Section card chrome from the page
	 * @property {string} [chartHeight]
	 * @property {number | undefined} [hoverTime]
	 * @property {((time: number | undefined) => void)} [onhoverchange]
	 * @property {((range: { start: number, end: number }) => void)} [onviewportchange]
	 * @property {((range: { start: number, end: number }) => void)} [onviewportsettle]
	 * @property {number} [reconcileSeq] - Bumped by the range control when a peer gesture settles
	 * @property {number} [minDateMs]
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
		dateStart = '',
		dateEnd = '',
		cardClass = '',
		chartHeight = 'h-[160px]',
		hoverTime = undefined,
		onhoverchange,
		onviewportchange,
		onviewportsettle,
		reconcileSeq = 0,
		minDateMs = undefined,
		panZoomEngaged = $bindable(false)
	} = $props();

	let scope = $derived(facilityCurtailmentScope(facility));
	/** The `?? 'both'` fallback never renders — the panel is gated on `scope` —
	 *  but keeps this a valid NetworkChart metric rather than an empty string. */
	let metric = $derived(curtailmentMetric(scope?.kind ?? 'both', basis));

	/** @type {NetworkChart | undefined} */
	let chart = $state(undefined);

	/** Last range mirrored into (or reported by) the chart. Plain object, not
	 *  `$state` — it's bookkeeping to break the push/echo cycle, and making it
	 *  reactive would re-run the mirroring effect on every write. */
	let applied = { start: 0, end: 0 };

	// Mirror the page's viewport down. Skipped when it already matches what the
	// chart last reported, so a gesture here doesn't get pushed straight back.
	$effect(() => {
		const start = viewStart;
		const end = viewEnd;
		const c = chart;
		if (!start || !end || !c) return;
		if (applied.start === start && applied.end === end) return;
		applied = { start, end };
		c.setViewport(start, end);
	});

	// A gesture settled on a peer chart: prune this chart's now-stale in-flight
	// fetches. Mirrors how the derived providers consume `reconcileSeq`.
	$effect(() => {
		const seq = reconcileSeq;
		if (!seq) return;
		chart?.reconcileFetches();
	});

	/** @param {{ start: number, end: number }} range */
	function handleViewportChange(range) {
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

		<NetworkChart
			bind:this={chart}
			region={scope.region}
			{metric}
			{interval}
			{displayInterval}
			chartKind="stacked"
			{timeZone}
			{dateStart}
			{dateEnd}
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
			{minDateMs}
		/>
	</section>
{/if}
