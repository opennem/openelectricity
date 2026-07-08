<script>
	/**
	 * FacilitySnapshotCharts — compact, fixed 3-day Generation + Price snapshots
	 * for the /facilities detail pane. Reuses the same charts as the dedicated
	 * /facility/[code] page (FacilityChart for generation, FacilityPriceChart via
	 * FacilityFinancialDataProvider for the derived $/MWh line), in a static
	 * read-only form: no range bar, no zoom controls, pan disabled (hover tooltips
	 * still work). Both charts self-fetch their own data client-side.
	 *
	 * The window ends "now" for operating facilities, or at the last-seen / closure
	 * date for fully-retired ones (mirroring /facility/[code]'s computeRetiredEndMs)
	 * so a decommissioned facility still shows its final operating days.
	 */

	import { getNetworkTimezone } from '$lib/components/charts/facility';
	import { dataEndMs } from '$lib/components/charts/facility/data-end.js';
	import { toNetworkDateString } from '$lib/components/charts/v2/network-time.js';
	import FacilitySnapshotBody from './FacilitySnapshotBody.svelte';

	/**
	 * @type {{
	 *   facility: any,
	 *   generationHeight?: string,
	 *   priceHeight?: string
	 * }}
	 */
	let { facility, generationHeight = undefined, priceHeight = undefined } = $props();

	const DAY_MS = 24 * 60 * 60 * 1000;
	const SNAPSHOT_DAYS = 3;

	let timeZone = $derived(getNetworkTimezone(facility?.network_id));

	// Anchor the window end: "now" normally, or the latest data_last_seen /
	// closure_date for a fully-retired facility, so a decommissioned facility
	// still shows its final operating days instead of an empty range.
	let endMs = $derived(dataEndMs(facility?.units ?? []));

	let dates = $derived({
		start: toNetworkDateString(endMs - SNAPSHOT_DAYS * DAY_MS, timeZone),
		end: toNetworkDateString(endMs, timeZone)
	});

	// Exact ms viewport for the financial provider — derived with the same formula
	// FacilityChart applies to its date strings so the two x-axes line up.
	let viewStart = $derived(new Date(dates.start + 'T00:00:00' + timeZone).getTime());
	let viewEnd = $derived(
		Math.min(new Date(dates.end + 'T23:59:59' + timeZone).getTime(), Date.now())
	);

	// Remount per facility so the body's load-tracking state resets. Units-only
	// changes (e.g. a filtered list row upgrading to the complete facility once
	// its detail loads) no longer need a remount — the chart data managers
	// re-key themselves on the unit set (see ChartDataManager `unitsKey`).
	let bodyKey = $derived(facility?.code ?? '');
</script>

{#if facility}
	{#key bodyKey}
		<FacilitySnapshotBody
			{facility}
			{timeZone}
			dateStart={dates.start}
			dateEnd={dates.end}
			{viewStart}
			{viewEnd}
			days={SNAPSHOT_DAYS}
			{generationHeight}
			{priceHeight}
		/>
	{/key}
{/if}
