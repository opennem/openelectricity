<script>
	/**
	 * Tracker Profile — the average day (or each day) by time of day over a
	 * bounded window, with the profile CSV export.
	 */

	import { downloadCsv } from '$lib/utils/download-csv.js';
	import { OptionsMenuItem } from '$lib/components/ui/options-menu';
	import { formatDayMonthTime } from '$lib/components/charts/v2/date-labels.js';
	import TrackerShell from '../TrackerShell.svelte';
	import TimeOfDay from '../TimeOfDay.svelte';
	import { createTrackerPage } from '../tracker-page.js';
	import { datasetToCsv } from '../tracker-export.js';
	import { TRACKER_SHORTCUTS } from '../tracker-shortcuts.js';

	/** @type {{ data: import('./$types').PageData }} */
	let { data } = $props();
	// Route data seeds the session once; history restores through it.
	const { session, shareUrl } = createTrackerPage(() => data);

	let canvas = $state.raw(/** @type {TimeOfDay | undefined} */ (undefined));

	const SHORTCUTS = TRACKER_SHORTCUTS.filter(({ id }) => id === 'refresh').map(
		({ label, keys }) => ({ label, keys })
	);
	/** When the profile's "now" was last taken: page load or the latest refresh. */
	let updatedLabel = $derived(formatDayMonthTime(session.anchorEnd, session.ianaTimeZone));

	/** @param {import('../tracker-shortcuts.js').TrackerShortcut} id */
	function handleShortcut(id) {
		if (id === 'refresh') canvas?.refresh();
	}

	function downloadProfile() {
		const dataset = canvas?.exportDataset();
		if (canvas && dataset)
			downloadCsv(datasetToCsv(dataset, session.timeZone), canvas.exportFileName());
	}
</script>

<TrackerShell
	view="profile"
	{session}
	{shareUrl}
	controls={canvas?.getControls()}
	downloadItems={[{ key: 'profile', label: 'Profile', disabled: !canvas?.canExport() }]}
	ondownloaditem={downloadProfile}
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

	<TimeOfDay bind:this={canvas} {session} />
</TrackerShell>
