<script>
	import { Download, FileSpreadsheet, LoaderCircle, X } from '@lucide/svelte';
	import Modal from '$lib/components/Modal.svelte';
	import ButtonIcon from '$lib/components/form-elements/ButtonIcon.svelte';
	import { downloadStatus, workbookAvailability } from './chart-downloads.js';

	/**
	 * DownloadDataModal — a page's "Download data" dialog. Lists a CSV for
	 * every chart and panel registered with the page's `downloads`
	 * (`chart-downloads.svelte.js`; in screen order, live: rows follow the
	 * page while it stays open), then the "All charts" workbook. A row's
	 * button stays disabled until its chart is ready. Opened and closed
	 * through `downloads.open`.
	 *
	 * @type {{ downloads: import('./chart-downloads.svelte.js').ChartDownloads }}
	 */
	let { downloads } = $props();

	let rows = $derived(downloads.entries.map((entry) => ({ entry, source: entry.get() })));
	let sources = $derived(rows.map((row) => row.source));
	let workbook = $derived(workbookAvailability(sources.map((source) => source.state)));
	let sheetCount = $derived(sources.filter((source) => source.state === 'ready').length);

	const ICON_BUTTON =
		'inline-flex size-[32px] shrink-0 items-center justify-center rounded-md text-dark-grey transition-colors hover:bg-light-warm-grey disabled:cursor-default disabled:text-mid-grey/50 disabled:hover:bg-transparent';
</script>

{#snippet heading(/** @type {any} */ Icon, /** @type {string} */ label)}
	<h3
		class="m-0 flex items-center gap-3 px-1 pb-2 font-space text-[10px] font-normal uppercase tracking-wider text-mid-grey"
	>
		<Icon class="size-4" aria-hidden="true" />
		{label}
	</h3>
{/snippet}

<Modal bind:open={downloads.open} title="Download data" maxWidthClass="max-w-[480px]">
	{#snippet header()}
		<ButtonIcon onclick={() => (downloads.open = false)}>
			<X class="size-4" aria-hidden="true" />
			<span class="sr-only">Close download data</span>
		</ButtonIcon>
	{/snippet}
	<div class="space-y-6 pb-2">
		{#if downloads.error}
			<p role="alert" class="m-0 rounded-md bg-light-warm-grey px-3 py-2 text-sm">
				{downloads.error}
			</p>
		{/if}

		<section aria-labelledby="download-csv-heading">
			<div id="download-csv-heading">{@render heading(Download, 'Download as CSV')}</div>
			{#if rows.length}
				<ul class="m-0 list-none divide-y divide-warm-grey border-y border-warm-grey p-0">
					{#each rows as { entry, source } (entry)}
						{@const message = downloadStatus(source)}
						<li
							class="flex items-center justify-between gap-4 py-2 pl-1"
							data-testid="download-row"
							data-download-id={source.id}
							data-state={source.state}
						>
							<div class="min-w-0">
								<p class="m-0 truncate text-sm text-dark-grey">{source.label}</p>
								{#if message}
									<p class="m-0 text-xs text-mid-grey">{message}</p>
								{/if}
							</div>
							<button
								type="button"
								class={ICON_BUTTON}
								aria-label="Download {source.label} CSV"
								title="Download CSV"
								disabled={source.state !== 'ready'}
								onclick={() => downloads.csv(source)}
							>
								<Download class="size-[16px]" aria-hidden="true" />
							</button>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="m-0 px-1 text-sm text-mid-grey">No charts to download.</p>
			{/if}
		</section>

		<section aria-labelledby="download-xlsx-heading">
			<div id="download-xlsx-heading">{@render heading(FileSpreadsheet, 'Download as XLSX')}</div>
			<div
				class="flex items-center justify-between gap-4 border-y border-warm-grey py-2 pl-1"
				data-testid="download-workbook"
			>
				<div class="min-w-0">
					<p class="m-0 text-sm text-dark-grey">All charts</p>
					<p class="m-0 text-xs text-mid-grey">
						{workbook.enabled
							? `Summary + ${sheetCount} ${sheetCount === 1 ? 'sheet' : 'sheets'}`
							: workbook.reason}
					</p>
				</div>
				<button
					type="button"
					class={ICON_BUTTON}
					aria-label="Download all charts XLSX"
					title="Download XLSX"
					disabled={!workbook.enabled || downloads.building}
					onclick={() => downloads.workbook(sources)}
				>
					{#if downloads.building}
						<LoaderCircle class="size-[16px] animate-spin" aria-hidden="true" />
					{:else}
						<Download class="size-[16px]" aria-hidden="true" />
					{/if}
				</button>
			</div>
		</section>
	</div>
</Modal>
