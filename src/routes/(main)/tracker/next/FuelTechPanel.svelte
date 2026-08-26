<script>
	import { DEFAULT_GROUP } from './tracker-model.js';
	import FuelTechTable from './FuelTechTable.svelte';

	/**
	 * FuelTechPanel — chrome around the fuel-tech table in the tracker's right
	 * panel: the Show-all affordance and the keep-stale-rows loading veil. The
	 * grouping and contribution dropdowns live inside the table's column
	 * headers.
	 *
	 * @type {{
	 *   rows: import('./types.js').FuelTechTableRow[] | null,
	 *   pending?: boolean,
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
		pending = false,
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
</script>

<div class="flex h-full min-h-0 flex-col">
	{#if rangeLabel}
		<!-- The visible window, in network time (AEST; AWST for the WEM). -->
		<div
			class="shrink-0 border-b border-warm-grey px-4 py-2 text-right font-space text-xs text-mid-grey"
		>
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

	<div class="relative min-h-0 flex-1 overflow-auto">
		{#if rows}
			<FuelTechTable
				{rows}
				{basis}
				{group}
				{contributionMode}
				{curtailmentRows}
				{shownCurtailment}
				{curtailmentColours}
				{oncurtailmenttoggle}
				{overlaySummary}
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
			{#if pending}
				<!-- Keep the stale rows legible under a light veil while refetching —
				     never blank the previous view. -->
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
