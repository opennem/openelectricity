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

	/**
	 * YYYY-MM-DD for the given instant in the network's local day.
	 * @param {number} ms
	 */
	function toDateStr(ms) {
		const offsetMs = timeZone === '+08:00' ? 8 * 3600_000 : 10 * 3600_000;
		return new Date(ms + offsetMs).toISOString().slice(0, 10);
	}

	// Anchor the window end: "now" normally, or the latest data_last_seen /
	// closure_date for a fully-retired facility, so a decommissioned facility
	// still shows its final operating days instead of an empty range.
	let endMs = $derived.by(() => {
		const units = facility?.units ?? [];
		const now = Date.now();
		const isFullyRetired =
			units.length > 0 && units.every((/** @type {any} */ u) => u.status_id === 'retired');
		if (!isFullyRetired) return now;

		/** @type {string | null} */
		let anchor = null;
		for (const u of units) {
			const d = u.data_last_seen;
			if (d && (!anchor || d > anchor)) anchor = d;
		}
		if (!anchor) {
			for (const u of units) {
				const d = u.closure_date;
				if (d && (!anchor || d > anchor)) anchor = d;
			}
		}
		const t = anchor ? new Date(anchor).getTime() : NaN;
		return Number.isFinite(t) ? Math.min(t, now) : now;
	});

	let dates = $derived({ start: toDateStr(endMs - SNAPSHOT_DAYS * DAY_MS), end: toDateStr(endMs) });

	// Exact ms viewport for the financial provider — derived with the same formula
	// FacilityChart applies to its date strings so the two x-axes line up.
	let viewStart = $derived(new Date(dates.start + 'T00:00:00' + timeZone).getTime());
	let viewEnd = $derived(
		Math.min(new Date(dates.end + 'T23:59:59' + timeZone).getTime(), Date.now())
	);

	// Remount on the unit SET, not just the code: a facility selected from a
	// filtered list arrives first as a list row carrying only the filtered fuel
	// techs' units, then as the complete facility once its detail loads. The chart
	// data managers bake in unitOrder/unitFuelTechMap at creation and don't pick up
	// a units-only change, so without this the charts would plot only the filtered
	// fuel tech. Keying on the unit codes recreates them with the full set.
	let bodyKey = $derived(
		`${facility?.code ?? ''}:${(facility?.units ?? [])
			.map((/** @type {any} */ u) => u.code)
			.sort()
			.join('|')}`
	);
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
