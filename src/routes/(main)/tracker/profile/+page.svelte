<script>
	/**
	 * Tracker Profile — the average day (or each day) by time of day over a
	 * bounded window, with the profile CSV export.
	 */

	import { downloadCsv } from '$lib/utils/download-csv.js';
	import TrackerShell from '../TrackerShell.svelte';
	import TimeOfDay from '../TimeOfDay.svelte';
	import RangeStatus from '../RangeStatus.svelte';
	import { createTrackerPage } from '../tracker-page.js';
	import { datasetToCsv } from '../tracker-export.js';

	/** @type {{ data: import('./$types').PageData }} */
	let { data } = $props();
	// Route data seeds the session once; history restores through it.
	const { session, shareUrl } = createTrackerPage(() => data);

	let canvas = $state.raw(/** @type {TimeOfDay | undefined} */ (undefined));

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
>
	{#snippet status()}
		<RangeStatus
			label={canvas?.getRangeLabel() ?? ''}
			inspectLabel={canvas?.getInspectLabel()}
			loading={!!canvas?.isLoading()}
		/>
	{/snippet}

	<TimeOfDay bind:this={canvas} {session} />
</TrackerShell>
