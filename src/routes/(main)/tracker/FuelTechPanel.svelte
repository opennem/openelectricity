<script>
	import { untrack } from 'svelte';
	import { DEFAULT_GROUP } from './tracker-model.js';
	import FuelTechTable from './FuelTechTable.svelte';

	/**
	 * FuelTechPanel — chrome around the fuel-tech table in the tracker's right
	 * panel: the Show-all affordance and the two loading treatments. The
	 * grouping and contribution dropdowns live inside the table's column
	 * headers.
	 *
	 * Value refreshes dim the previous snapshot. Region and grouping changes
	 * replace the row structure under an "Updating…" veil.
	 *
	 * @type {{
	 *   rows: import('./types.js').FuelTechTableRow[] | null,
	 *   valuesPending?: boolean,
	 *   structurePending?: boolean,
	 *   structureKey?: string,
	 *   basis?: 'power' | 'energy',
	 *   group?: string,
	 *   contributionMode?: import('./types.js').ContributionMode,
	 *   hiddenCount?: number,
	 *   rangeLabel?: string,
	 *   curtailmentRows?: Array<{ id: string, label: string, avPowerMW: number, contributionPct: number | null }>,
	 *   shownCurtailment?: string[],
	 *   curtailmentColours?: Record<string, string>,
	 *   oncurtailmenttoggle?: (id: string) => void,
	 *   overlaySummary?: { demandAvMW: number | null, renewablesAvMW: number | null, renewablesSharePct: number | null } | null,
	 *   showDemandLine?: boolean,
	 *   showRenewablesLine?: boolean,
	 *   demandLineColour?: string,
	 *   renewablesLineColour?: string,
	 *   ondemandlinetoggle?: () => void,
	 *   onrenewableslinetoggle?: () => void,
	 *   ongroupchange?: (group: string) => void,
	 *   oncontributionmodechange?: (mode: import('./types.js').ContributionMode) => void,
	 *   ontoggle?: (series: string) => void,
	 *   onshowall?: () => void
	 * }}
	 */
	let {
		rows = null,
		valuesPending = false,
		structurePending = false,
		structureKey = '',
		basis = 'power',
		group = DEFAULT_GROUP,
		contributionMode = 'generation',
		hiddenCount = 0,
		rangeLabel = '',
		curtailmentRows = [],
		shownCurtailment = [],
		curtailmentColours = {},
		oncurtailmenttoggle,
		overlaySummary = null,
		showDemandLine = false,
		showRenewablesLine = false,
		demandLineColour = '#C74523',
		renewablesLineColour = '#52A972',
		ondemandlinetoggle,
		onrenewableslinetoggle,
		ongroupchange,
		oncontributionmodechange,
		ontoggle,
		onshowall
	} = $props();

	/** Keep one complete table snapshot during value refreshes. Replace it
	 *  immediately when the region or grouping key changes. */
	/** @type {{ key: string, rows: import('./types.js').FuelTechTableRow[], curtailmentRows: any[], overlaySummary: any } | null} */
	let displayed = $state.raw(null);
	$effect(() => {
		// Capture every dependency before reading the current snapshot untracked.
		const next = { key: structureKey, rows, curtailmentRows, overlaySummary };
		if (!next.rows) return;
		const held = untrack(() => displayed);
		if (held && held.key === next.key && (valuesPending || structurePending)) return;
		displayed = /** @type {typeof displayed} */ (next);
	});
</script>

<div class="flex h-full min-h-0 flex-col">
	{#if rangeLabel}
		<!-- Network-local window; the dot shows that values are catching up. -->
		<div
			class="flex shrink-0 items-center justify-end gap-2 border-b border-warm-grey px-4 py-2 text-right font-space text-xs text-mid-grey"
		>
			{#if valuesPending && !structurePending}
				<span
					class="size-1.5 shrink-0 animate-pulse rounded-full bg-mid-warm-grey"
					aria-hidden="true"
				></span>
			{/if}
			{rangeLabel}
		</div>
	{/if}
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

	<div class="relative min-h-0 flex-1 overflow-auto" aria-busy={valuesPending || structurePending}>
		{#if displayed}
			<FuelTechTable
				rows={displayed.rows}
				valuesPending={valuesPending && !structurePending}
				{basis}
				{group}
				{contributionMode}
				curtailmentRows={displayed.curtailmentRows}
				{shownCurtailment}
				{curtailmentColours}
				{oncurtailmenttoggle}
				overlaySummary={displayed.overlaySummary}
				{showDemandLine}
				{showRenewablesLine}
				{demandLineColour}
				{renewablesLineColour}
				{ondemandlinetoggle}
				{onrenewableslinetoggle}
				{ongroupchange}
				{oncontributionmodechange}
				{ontoggle}
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
