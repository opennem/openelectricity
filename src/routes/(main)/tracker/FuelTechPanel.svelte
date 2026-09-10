<script>
	import PanelToggle from './PanelToggle.svelte';
	import FuelTechTable from './FuelTechTable.svelte';
	import LoadingOverlay from './LoadingOverlay.svelte';

	/** @typedef {import('./types.js').FuelTechTableRow} FuelTechTableRow */
	/** @typedef {import('./types.js').CurtailmentTableRow} CurtailmentTableRow */
	/** @typedef {import('./types.js').OverlaySummary} OverlaySummary */

	/**
	 * FuelTechPanel — table chrome, errors and panel actions.
	 *
	 * TrackerCanvas holds the previous snapshot under its shared loading layer.
	 * Every other table control is forwarded to FuelTechTable untouched.
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
	 *   options?: import('svelte').Snippet
	 *   rooftopInterpolation?: boolean
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
		...tableControls
	} = $props();
</script>

<div id="tracker-table-panel" class="flex h-full min-h-0 flex-col">
	<div
		class="flex h-[48px] shrink-0 items-center gap-[10px] border-b border-warm-grey bg-white px-[4px]"
	>
		<PanelToggle
			side="right"
			open
			label="Hide fuel tech table"
			controls="tracker-table-panel"
			onclick={() => onclose?.()}
			bind:el={closeButton}
		/>
		<h3 class="m-0 min-w-0 flex-1 truncate text-sm font-semibold">Fuel technologies</h3>
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
	</div>

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
