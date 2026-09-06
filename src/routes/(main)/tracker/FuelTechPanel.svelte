<script>
	import PanelRightClose from '@lucide/svelte/icons/panel-right-close';
	import FuelTechTable from './FuelTechTable.svelte';

	/** @typedef {import('./types.js').FuelTechTableRow} FuelTechTableRow */
	/** @typedef {import('./types.js').CurtailmentTableRow} CurtailmentTableRow */
	/** @typedef {import('./types.js').OverlaySummary} OverlaySummary */

	/**
	 * FuelTechPanel — table chrome, loading treatments and panel actions.
	 *
	 * Value refreshes dim the previous snapshot. Region and grouping changes
	 * replace the row structure under an "Updating…" veil. Every other table
	 * control is forwarded to FuelTechTable untouched.
	 *
	 * @type {import('./types.js').FuelTechTableControls & {
	 *   rows: FuelTechTableRow[] | null,
	 *   valuesPending?: boolean,
	 *   structurePending?: boolean,
	 *   error?: string | null,
	 *   onretry?: () => void,
	 *   curtailmentRows?: CurtailmentTableRow[],
	 *   overlaySummary?: OverlaySummary | null,
	 *   hiddenCount?: number,
	 *   onshowall?: () => void,
	 *   onclose?: () => void
	 * }}
	 */
	let {
		rows = null,
		valuesPending = false,
		structurePending = false,
		error = null,
		onretry,
		curtailmentRows = [],
		overlaySummary = null,
		hiddenCount = 0,
		onshowall,
		onclose,
		...tableControls
	} = $props();
</script>

<div class="flex h-full min-h-0 flex-col">
	<!-- The pulse distinguishes a value refresh from a structural reload. -->
	<div
		class="flex shrink-0 items-center justify-between gap-2 border-b border-warm-grey px-2 py-1.5"
	>
		<button
			type="button"
			onclick={() => onclose?.()}
			aria-label="Hide fuel tech table"
			class="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-dark-grey transition-colors hover:bg-warm-grey"
		>
			<PanelRightClose class="size-5" />
		</button>
		{#if valuesPending && !structurePending}
			<span
				class="mr-2 size-1.5 shrink-0 animate-pulse rounded-full bg-mid-warm-grey"
				aria-hidden="true"
			></span>
		{/if}
	</div>
	{#if hiddenCount > 0}
		<header class="flex shrink-0 justify-end border-b border-warm-grey px-4 py-2">
			<button
				type="button"
				onclick={() => onshowall?.()}
				class="shrink-0 rounded-md border border-mid-warm-grey px-2.5 py-1 font-space text-xs text-dark-grey transition-colors hover:bg-warm-grey"
			>
				Show all
			</button>
		</header>
	{/if}

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
	<div class="relative min-h-0 flex-1 overflow-auto" aria-busy={valuesPending || structurePending}>
		{#if rows}
			<FuelTechTable
				{...tableControls}
				{rows}
				{curtailmentRows}
				{overlaySummary}
				valuesPending={valuesPending && !structurePending}
			/>
			{#if structurePending}
				<!-- Structural changes replace the rows; value refreshes only dim them. -->
				<div class="absolute inset-0 z-10 flex items-start justify-center bg-white/60 pt-16">
					<span
						class="rounded-full border border-warm-grey bg-white px-3 py-1 font-space text-xs text-mid-grey shadow-sm"
					>
						Updating…
					</span>
				</div>
			{/if}
		{:else}
			<div class="space-y-2 p-4" aria-hidden="true">
				{#each { length: 8 } as _, index (index)}
					<div class="h-9 animate-pulse rounded bg-light-warm-grey"></div>
				{/each}
			</div>
			<p class="m-0 px-4 py-2 text-xs text-mid-grey">Table appears when chart data loads.</p>
		{/if}
	</div>
</div>
