<script>
	/**
	 * Tracker Timeline — range-driven chart cards beside the fuel-tech table,
	 * with live refresh and the metrics strip. Each card registers its own
	 * download; the canvas supplies the workbook Summary and file names.
	 */

	import { MediaQuery } from 'svelte/reactivity';
	import { ChartRangeBar } from '$lib/components/charts/v2';
	import { getIntervalSpec } from '$lib/components/charts/facility/range-interval-config.js';
	import { BELOW_TABLET_QUERY } from '$lib/utils/fullscreen-mode.js';
	import { formatDayMonthTime } from '$lib/components/charts/v2/date-labels.js';
	import { MIN_DATE } from '$lib/utils/date-range.js';
	import { OptionsMenuItem } from '$lib/components/ui/options-menu';
	import TrackerShell from '../TrackerShell.svelte';
	import TrackerCanvas from '../TrackerCanvas.svelte';
	import { createMetricsVisibilityPreference } from '../metrics-visibility.svelte.js';
	import { TRACKER_SHORTCUTS } from '../tracker-shortcuts.js';
	import { createTrackerPage } from '../tracker-page.js';

	/** @type {{ data: import('./$types').PageData }} */
	let { data } = $props();
	// Route data seeds the session once; history restores through it.
	const { session, shareUrl } = createTrackerPage(() => data);

	const SHORTCUTS = TRACKER_SHORTCUTS.filter(({ id }) => id === 'refresh' || id === 'metrics').map(
		({ label, keys }) => ({ label, keys })
	);

	const metricsVisible = createMetricsVisibilityPreference();
	// Phones have no metrics strip: the menu opens them in a dialog.
	const belowTablet = new MediaQuery(BELOW_TABLET_QUERY);
	const range = session.range;
	let canvas = $state.raw(/** @type {TrackerCanvas | undefined} */ (undefined));
	let loading = $derived(!canvas || canvas.isLoading());

	/** When the tracker last finished loading — the readout's tooltip reports it. */
	let updatedMs = $state(/** @type {number | undefined} */ (undefined));
	let wasLoading = false;
	// A timestamp of an event (loading finished), so an effect, not a derivation.
	$effect(() => {
		if (wasLoading && !loading) updatedMs = Date.now();
		wasLoading = loading;
	});
	let updatedLabel = $derived(
		updatedMs === undefined ? undefined : formatDayMonthTime(updatedMs, session.ianaTimeZone)
	);
	/** The reader asked: fetch fresh data now, bypassing response caches. The
	 * newest buckets are revisited and a following window advances; only an
	 * active gesture defers it. */
	function refreshData() {
		const now = Date.now();
		if (session.refresh(now, { force: true })) updatedMs = now;
	}

	/** @param {import('../tracker-shortcuts.js').TrackerShortcut} id */
	function handleShortcut(id) {
		if (id === 'metrics') metricsVisible.toggle();
		else if (id === 'refresh') refreshData();
	}
</script>

<TrackerShell
	view="timeline"
	{session}
	{shareUrl}
	downloadSummary={() => canvas?.downloadSummary() ?? []}
	downloadFileName={(id, extension) => canvas?.downloadFileName(id, extension) ?? ''}
	shortcuts={SHORTCUTS}
	onshortcut={handleShortcut}
	status={{
		label: canvas?.getRangeLabel() ?? session.rangeLabel,
		intervalLabel: getIntervalSpec(range.displayInterval)?.label,
		inspectLabel: canvas?.getInspectLabel(),
		loading,
		updatedLabel,
		onrefresh: refreshData
	}}
>
	{#snippet controls()}
		<ChartRangeBar
			--chart-range-gap="1rem"
			selectedRange={range.selectedRange}
			customDays={range.customDays}
			displayInterval={range.displayInterval}
			startDate={range.pickerStartDate}
			endDate={range.pickerEndDate}
			minDate={MIN_DATE}
			maxDate={range.maxDate}
			showIntervalDropdown
			includeRollingInterval
			showBucketFilter
			bucketFilter={session.selection.bucketFilter}
			onbucketfilterchange={(value) => session.select('bucketFilter', value)}
			variant="expanded"
			onrangeselect={session.selectRange}
			ondaterangechange={session.selectDates}
			onintervalchange={session.selectInterval}
		/>
	{/snippet}

	{#snippet menu({ close })}
		<OptionsMenuItem
			kbd="R"
			disabled={loading}
			onclick={() => {
				close();
				refreshData();
			}}>Refresh data</OptionsMenuItem
		>
		{#if belowTablet.current}
			<OptionsMenuItem
				onclick={() => {
					close();
					canvas?.openMetrics();
				}}>Metrics</OptionsMenuItem
			>
		{:else}
			<OptionsMenuItem
				kbd="M"
				onclick={() => {
					close();
					metricsVisible.toggle();
				}}>{metricsVisible.value ? 'Hide metrics' : 'Show metrics'}</OptionsMenuItem
			>
		{/if}
	{/snippet}

	<TrackerCanvas bind:this={canvas} {session} showMetrics={metricsVisible.value} />
</TrackerShell>
