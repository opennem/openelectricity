<script>
	/**
	 * Tracker Compare — selected metrics across regions over a shared period,
	 * with comparison CSV and workbook exports.
	 */

	import { downloadCsv } from '$lib/utils/download-csv.js';
	import { downloadXlsx } from '$lib/utils/download-xlsx.js';
	import { formatDayMonthTime } from '$lib/components/charts/v2/date-labels.js';
	import { OptionsMenuItem } from '$lib/components/ui/options-menu';
	import TrackerShell from '../TrackerShell.svelte';
	import RegionComparison from '../RegionComparison.svelte';
	import { createTrackerPage } from '../tracker-page.js';
	import { TRACKER_SHORTCUTS } from '../tracker-shortcuts.js';
	import {
		comparisonFileName,
		comparisonWorkbook,
		regionComparisonCsv
	} from '../region-comparison-export.js';

	/** @type {{ data: import('./$types').PageData }} */
	let { data } = $props();
	// Route data seeds the session once; history restores through it.
	const { session, shareUrl } = createTrackerPage(() => data);

	let notice = $state('');
	let canvas = $state.raw(/** @type {RegionComparison | undefined} */ (undefined));
	let empty = $derived(!canvas?.canExport());

	const SHORTCUTS = TRACKER_SHORTCUTS.filter(({ id }) => id === 'refresh').map(
		({ label, keys }) => ({ label, keys })
	);
	/** When the comparison's "now" was last taken: page load or the latest refresh. */
	let updatedLabel = $derived(formatDayMonthTime(session.anchorEnd, session.ianaTimeZone));

	/** @param {import('../tracker-shortcuts.js').TrackerShortcut} id */
	function handleShortcut(id) {
		if (id === 'refresh') canvas?.refresh();
	}

	/** The comparison's dataset and selection, or null while nothing can export. */
	function exportable() {
		const dataset = canvas?.exportDataset();
		return canvas && dataset?.rows.length
			? { dataset, selection: canvas.getSelection(), viewport: canvas.getViewport() }
			: null;
	}

	function downloadComparison() {
		const ready = exportable();
		if (ready)
			downloadCsv(
				regionComparisonCsv(ready.dataset),
				comparisonFileName(ready.selection, ready.viewport, 'csv')
			);
	}

	async function downloadWorkbook() {
		const ready = exportable();
		if (!ready) return;
		try {
			await downloadXlsx(
				comparisonWorkbook(ready.dataset, shareUrl().href, ready.selection),
				comparisonFileName(ready.selection, ready.viewport, 'xlsx')
			);
		} catch {
			notice = 'Could not build the workbook.';
		}
	}
</script>

<TrackerShell
	view="compare"
	{session}
	{shareUrl}
	bind:notice
	regionSelect={false}
	controls={canvas?.getControls()}
	downloadItems={[{ key: 'regions', label: 'Region comparison', disabled: empty }]}
	ondownloaditem={downloadComparison}
	ondownloadxlsx={downloadWorkbook}
	downloadXlsxDisabled={empty}
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
