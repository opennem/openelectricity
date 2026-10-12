<script>
	/**
	 * Tracker Compare — selected metrics across regions over a shared period,
	 * one card per chart. Each card and the Regions table register their own
	 * download.
	 */

	import { formatDayMonthTime } from '$lib/components/charts/v2/date-labels.js';
	import { OptionsMenuItem } from '$lib/components/ui/options-menu';
	import TrackerShell from '../TrackerShell.svelte';
	import RegionComparison from '../RegionComparison.svelte';
	import { createTrackerPage } from '../tracker-page.js';
	import { TRACKER_SHORTCUTS } from '../tracker-shortcuts.js';

	/** @type {{ data: import('./$types').PageData }} */
	let { data } = $props();
	// Route data seeds the session once; history restores through it.
	const { session, shareUrl } = createTrackerPage(() => data);

	let canvas = $state.raw(/** @type {RegionComparison | undefined} */ (undefined));

	const SHORTCUTS = TRACKER_SHORTCUTS.filter(({ id }) => id === 'refresh').map(
		({ label, keys }) => ({ label, keys })
	);
	/** When the comparison's "now" was last taken: page load or the latest refresh. */
	let updatedLabel = $derived(formatDayMonthTime(session.anchorEnd, session.ianaTimeZone));

	/** @param {import('../tracker-shortcuts.js').TrackerShortcut} id */
	function handleShortcut(id) {
		if (id === 'refresh') canvas?.refresh();
	}
</script>

<TrackerShell
	view="compare"
	{session}
	{shareUrl}
	regionSelect={false}
	controls={canvas?.getControls()}
	downloadSummary={() => canvas?.downloadSummary() ?? []}
	downloadFileName={(id, extension) => canvas?.downloadFileName(id, extension) ?? ''}
	shortcuts={SHORTCUTS}
	onshortcut={handleShortcut}
	status={{
		label: canvas?.getRangeLabel() ?? '',
		inspectLabel: canvas?.getInspectLabel(),
		loading: !!canvas?.isLoading(),
		updatedLabel,
		onrefresh: () => canvas?.refresh()
	}}
>
	{#snippet menu({ close })}
		<OptionsMenuItem
			kbd="R"
			disabled={!!canvas?.isLoading()}
			onclick={() => {
				close();
				canvas?.refresh();
			}}>Refresh data</OptionsMenuItem
		>
	{/snippet}

	<RegionComparison bind:this={canvas} {session} cpi={data.comparisonCpi} />
</TrackerShell>
