<script>
	/**
	 * Tracker Timeline — range-driven chart cards beside the fuel-tech table,
	 * with live refresh, the metrics strip and dataset/workbook exports.
	 */

	import { ChartRangeBar } from '$lib/components/charts/v2';
	import { formatDayMonthTime } from '$lib/components/charts/v2/date-labels.js';
	import { MIN_DATE } from '$lib/utils/date-range.js';
	import { downloadCsv } from '$lib/utils/download-csv.js';
	import { downloadXlsx } from '$lib/utils/download-xlsx.js';
	import { OptionsMenuItem } from '$lib/components/ui/options-menu';
	import TrackerShell from '../TrackerShell.svelte';
	import TrackerCanvas from '../TrackerCanvas.svelte';
	import { createMetricsVisibilityPreference } from '../metrics-visibility.svelte.js';
	import { TRACKER_SHORTCUTS } from '../tracker-shortcuts.js';
	import { createTrackerPage } from '../tracker-page.js';
	import {
		buildExportDataset,
		buildWorkbookSheets,
		datasetToCsv,
		exportFileName,
		trackerDownloadItems
	} from '../tracker-export.js';

	/** @typedef {import('../types.js').ExportDatasetKey} ExportDatasetKey */
	/** @typedef {import('../types.js').TrackerExportContext} TrackerExportContext */

	/** @type {{ data: import('./$types').PageData }} */
	let { data } = $props();
	// Route data seeds the session once; history restores through it.
	const { session, shareUrl } = createTrackerPage(() => data);

	const SHORTCUTS = TRACKER_SHORTCUTS.filter(({ id }) => id === 'refresh' || id === 'metrics').map(
		({ label, keys }) => ({ label, keys })
	);
	const LOADING_NOTICE = 'Charts are still loading — try again in a moment.';
	const EMPTY_NOTICE = 'Nothing to export yet.';

	const metricsVisible = createMetricsVisibilityPreference();
	const range = session.range;
	let notice = $state('');
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

	let downloadItems = $derived(
		trackerDownloadItems({ tablePanelOpen: session.selection.tablePanelOpen }).map((item) => ({
			...item,
			disabled: !canvas || canvas.isExportPending(item.key)
		}))
	);

	/**
	 * The canvas's settled state plus the page's provenance, or null while
	 * the charts are mid-switch (the held frame would be stale).
	 * @returns {TrackerExportContext | null}
	 */
	function exportContext(requested = /** @type {ExportDatasetKey | 'xlsx'} */ ('xlsx')) {
		const context = canvas?.getExportContext(requested);
		if (!context || context.pending || context.error) {
			notice = context?.error
				? 'Some data could not load. Retry it before downloading.'
				: LOADING_NOTICE;
			return null;
		}
		return {
			...context,
			sourceUrl: shareUrl().href,
			generatedAtMs: Date.now()
		};
	}

	/** @param {string} value */
	function downloadDataset(value) {
		const key = /** @type {ExportDatasetKey} */ (value);
		const context = exportContext(key);
		if (!context) return;
		const dataset = buildExportDataset(key, context);
		if (!dataset) {
			notice = EMPTY_NOTICE;
			return;
		}
		downloadCsv(datasetToCsv(dataset, context.timeZone), exportFileName(context, key));
	}

	async function downloadWorkbook() {
		const context = exportContext();
		if (!context) return;
		const sheets = buildWorkbookSheets(context);
		// Summary alone means no dataset has arrived.
		if (sheets.length < 2) {
			notice = EMPTY_NOTICE;
			return;
		}
		try {
			await downloadXlsx(sheets, exportFileName(context, 'xlsx'));
		} catch (error) {
			console.error('Tracker workbook export failed', error);
			notice = 'Could not build the workbook.';
		}
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
	bind:notice
	{downloadItems}
	ondownloaditem={downloadDataset}
	ondownloadxlsx={downloadWorkbook}
	downloadXlsxDisabled={!canvas || canvas.isExportPending()}
	shortcuts={SHORTCUTS}
	onshortcut={handleShortcut}
	status={{
		label: session.rangeLabel,
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
		<OptionsMenuItem
			kbd="M"
			onclick={() => {
				close();
				metricsVisible.toggle();
			}}>{metricsVisible.value ? 'Hide metrics' : 'Show metrics'}</OptionsMenuItem
		>
	{/snippet}

	<TrackerCanvas bind:this={canvas} {session} showMetrics={metricsVisible.value} />
</TrackerShell>
