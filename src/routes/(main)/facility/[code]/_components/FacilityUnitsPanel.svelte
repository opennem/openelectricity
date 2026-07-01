<script>
	import { ChevronRight } from '@lucide/svelte';
	import FuelTechBadge from '$lib/components/FuelTechBadge.svelte';
	import { Sheet } from '$lib/components/ui/sheet';
	import { statusColours } from '$lib/theme/openelectricity';
	import { getFueltechColor, needsDarkText } from '$lib/utils/fueltech-display';
	import { fuelTechNameMap } from '$lib/fuel_techs';
	import { formatCapacity } from '$lib/utils/formatters';
	import { buildUnitColourMap } from '$lib/components/charts/facility/helpers.js';
	import { sortByDetailedOrder } from '$lib/fuel-tech-groups/detailed';
	import UnitDetail from './UnitDetail.svelte';

	/**
	 * @type {{
	 *   facility?: any | null,
	 *   sanityFacility?: any | null,
	 *   timeZone?: string
	 * }}
	 */
	let { facility = null, sanityFacility = null, timeZone = '+10:00' } = $props();

	// Top-of-stack first, matching the facility header + chart paint order.
	let units = $derived(
		/** @type {any[]} */ (sortByDetailedOrder(facility?.units ?? [], { reverse: true }))
	);
	let hasUnits = $derived(units.length > 0);

	let colours = $derived(buildUnitColourMap(units, getFueltechColor));

	// Track the selected unit by code (not object) so switching facility via the
	// picker re-derives against the new unit list and closes the sheet if the code
	// is gone, rather than stranding a stale unit object in the panel.
	/** @type {string | null} */
	let selectedCode = $state(null);
	let selectedUnit = $derived(
		selectedCode ? (units.find((u) => u.code === selectedCode) ?? null) : null
	);
	// Enrichment — the matching Sanity unit for the one selected unit.
	let selectedSanityUnit = $derived(
		selectedUnit
			? ((sanityFacility?.units ?? []).find(
					(/** @type {any} */ u) => u?.code === selectedUnit.code
				) ?? null)
			: null
	);
</script>

{#if hasUnits}
	<div class="rounded-lg border border-mid-warm-grey/40 bg-white">
		<div class="flex items-center justify-between border-b border-mid-warm-grey/40 px-6 py-3">
			<h3 class="m-0 text-sm font-semibold text-dark-grey">Units</h3>
			<span class="text-xs text-mid-grey">
				{units.length}
				{units.length === 1 ? 'unit' : 'units'}
			</span>
		</div>

		<ol class="divide-y divide-mid-warm-grey/40">
			{#each units as unit (unit.code)}
				{@const bgColor = colours[unit.code] || getFueltechColor(unit.fueltech_id)}
				{@const isDarkText = needsDarkText(unit.fueltech_id)}
				<li>
					<button
						type="button"
						class="group flex w-full cursor-pointer items-center gap-3 px-6 py-3 text-left transition-colors hover:bg-light-warm-grey"
						onclick={() => (selectedCode = unit.code)}
					>
						<span
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full {isDarkText
								? 'text-black'
								: 'text-white'}"
							style="background-color: {bgColor};"
						>
							<FuelTechBadge fuelTech={unit.fueltech_id} iconOnly iconSize={4} />
						</span>

						<div class="min-w-0 flex-1">
							<div class="flex items-baseline justify-between gap-2">
								<span class="truncate font-mono text-sm font-medium text-dark-grey">
									{unit.code_display ?? unit.code}
								</span>
								<span class="shrink-0 font-mono text-sm text-dark-grey">
									{formatCapacity(unit.capacity_maximum || unit.capacity_registered)}
									<span class="text-xs text-mid-grey">MW</span>
								</span>
							</div>
							<div class="mt-0.5 flex items-center gap-1.5 text-xs text-mid-grey">
								<span class="truncate">{fuelTechNameMap[unit.fueltech_id] || unit.fueltech_id}</span
								>
								<span aria-hidden="true">·</span>
								<span class="inline-flex shrink-0 items-center gap-1">
									<span
										class="h-1.5 w-1.5 rounded-full"
										style="background-color: {statusColours[unit.status_id] ||
											statusColours.operating};"
									></span>
									<span class="capitalize">{unit.status_id}</span>
								</span>
							</div>
						</div>

						<ChevronRight
							size={16}
							class="shrink-0 text-warm-grey transition-colors group-hover:text-mid-grey"
						/>
					</button>
				</li>
			{/each}
		</ol>
	</div>

	<Sheet
		open={selectedUnit !== null}
		side="right"
		width="min(480px, 100vw)"
		align="stretch"
		rounded={false}
		backdrop
		title={selectedUnit?.code_display ?? selectedUnit?.code ?? ''}
		onclose={() => (selectedCode = null)}
	>
		{#if selectedUnit}
			<UnitDetail unit={selectedUnit} sanityUnit={selectedSanityUnit} {timeZone} />
		{/if}
	</Sheet>
{/if}
