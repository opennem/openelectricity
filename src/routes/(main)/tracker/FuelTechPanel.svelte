<script>
	import TrackerPanelHeader from './TrackerPanelHeader.svelte';
	import FuelTechTable from './FuelTechTable.svelte';
	import LoadingOverlay from '$lib/components/charts/card/LoadingOverlay.svelte';
	import {
		getChartDownloads,
		chartDownload
	} from '$lib/components/charts/card/chart-downloads.svelte.js';

	/** @typedef {import('./types.js').FuelTechTableRow} FuelTechTableRow */
	/** @typedef {import('./types.js').CurtailmentTableRow} CurtailmentTableRow */
	/** @typedef {import('./types.js').OverlaySummary} OverlaySummary */

	/**
	 * FuelTechPanel — table chrome, errors and panel actions.
	 *
	 * TrackerCanvas holds the previous snapshot under its shared loading layer.
	 * Every other table control is forwarded to FuelTechTable untouched.
	 * `download` lists the table in the page's "Download data" dialog while the
	 * panel is open.
	 *
	 * @type {import('./types.js').FuelTechTableControls & {
	 *   rows: FuelTechTableRow[] | null,
	 *   valuesPending?: boolean,
	 *   loading?: boolean,
	 *   error?: string | null,
	 *   onretry?: () => void,
	 *   curtailmentRows?: CurtailmentTableRow[],
	 *   overlaySummary?: OverlaySummary | null,
	 *   hiddenCount?: number,
	 *   onshowall?: () => void,
	 *   onclose?: () => void,
	 *   closeButton?: HTMLButtonElement,
	 *   options?: import('svelte').Snippet,
	 *   rooftopInterpolation?: boolean,
	 *   download?: Omit<import('./types.js').DownloadSource, 'id' | 'label'>
	 * }}
	 */
	let {
		rows = null,
		valuesPending = false,
		loading = false,
		error = null,
		onretry,
		curtailmentRows = [],
		overlaySummary = null,
		hiddenCount = 0,
		onshowall,
		onclose,
		closeButton = $bindable(),
		options,
		download,
		...tableControls
	} = $props();
	const registerDownload = chartDownload(getChartDownloads(), () => ({
		id: 'table',
		label: 'Fuel tech table',
		state: download?.state ?? 'loading',
		message: download?.message,
		dataset: () => download?.dataset() ?? null
	}));
</script>

<div
	id="tracker-table-panel"
	class="flex h-full min-h-0 flex-col"
	{@attach download ? registerDownload : undefined}
	data-chart-download={download ? 'table' : undefined}
>
	<TrackerPanelHeader
		side="right"
		title="Fuel technologies"
		label="Hide fuel tech table"
		controls="tracker-table-panel"
		onclose={() => onclose?.()}
		bind:closeButton
	>
		{#if hiddenCount > 0}
			<button
				type="button"
				onclick={() => onshowall?.()}
				class="min-h-[32px] shrink-0 rounded-md border border-mid-warm-grey px-2.5 py-1 text-xs text-dark-grey transition-colors hover:bg-warm-grey"
			>
				Show all
			</button>
		{/if}
		{@render options?.()}
	</TrackerPanelHeader>

	{#if error}
		<div
			class="flex items-center justify-between gap-2 border-b border-warm-grey px-4 py-2 text-xs"
			role="status"
		>
			<span>Could not load table data.</span>
			<button type="button" class="rounded border border-warm-grey px-2 py-1" onclick={onretry}
				>Retry</button
			>
		</div>
	{/if}
	<div class="relative min-h-0 flex-1">
		<div
			class="h-full overflow-auto {error ? 'opacity-40' : ''}"
			aria-busy={!error && (!rows || valuesPending)}
		>
			{#if rows}
				<FuelTechTable {...tableControls} {rows} {curtailmentRows} {overlaySummary} />
			{/if}
		</div>
		<LoadingOverlay active={loading} />
	</div>
</div>
