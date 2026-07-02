<script>
	import { ChevronRight } from '@lucide/svelte';
	import FacilityStatusIcon from '$lib/components/facilities/FacilityStatusIcon.svelte';
	import { Sheet } from '$lib/components/ui/sheet';
	import { getFueltechColor, needsDarkText } from '$lib/utils/fueltech-display';
	import { fuelTechNameMap } from '$lib/fuel_techs';
	import { formatCapacity, getNumberFormat } from '$lib/utils/formatters';
	import { formatDateRange } from '$lib/components/charts/v2';
	import { buildUnitColourMap } from '$lib/components/charts/facility/helpers.js';
	import { sortByDetailedOrder } from '$lib/fuel-tech-groups/detailed';
	import { getPrimaryFuelTechGroup } from '$lib/components/charts/facility/metrics/fuel-group.js';
	import {
		isSubDailyData,
		computeUnitAvailability
	} from '$lib/components/charts/facility/metrics/metrics-calc.js';
	import UnitDetail from './UnitDetail.svelte';

	/**
	 * `intervalData` is the generation chart's visible-range power data
	 * (`FacilityChart` `onvisibledata`) — it feeds the per-unit availability bars
	 * for coal facilities, so the bars track the chart's current date range.
	 * @type {{
	 *   facility?: any | null,
	 *   sanityFacility?: any | null,
	 *   timeZone?: string,
	 *   intervalData?: { data: any[], seriesNames: string[] } | null
	 * }}
	 */
	let {
		facility = null,
		sanityFacility = null,
		timeZone = '+10:00',
		intervalData = null
	} = $props();

	const fmt0 = getNumberFormat(0);

	// Top-of-stack first, matching the facility header + chart paint order.
	let units = $derived(
		/** @type {any[]} */ (sortByDetailedOrder(facility?.units ?? [], { reverse: true }))
	);
	let hasUnits = $derived(units.length > 0);

	let colours = $derived(buildUnitColourMap(units, getFueltechColor));

	// Per-unit availability (% of visible-range intervals generating), coal only.
	// null = no availability column (non-coal facility, or no sub-daily data in
	// the visible range); a unit missing from the map has no series in range.
	/** @type {Record<string, number> | null} */
	let availabilityByUnit = $derived.by(() => {
		if (getPrimaryFuelTechGroup(facility?.units ?? []) !== 'coal') return null;
		const rows = intervalData?.data ?? [];
		if (!isSubDailyData(rows)) return null;
		/** @type {Record<string, number>} */
		const map = {};
		for (const entry of computeUnitAvailability(rows, intervalData?.seriesNames ?? [])) {
			map[entry.unit] = entry.availability;
		}
		return map;
	});
	let showAvailability = $derived(availabilityByUnit !== null);

	let ianaTimeZone = $derived(timeZone === '+08:00' ? 'Australia/Perth' : 'Australia/Brisbane');

	// The date range the availability bars cover — the chart's visible range
	// (first to last interval row), formatted like the page's own range label.
	let availabilityRange = $derived.by(() => {
		const rows = intervalData?.data ?? [];
		if (!showAvailability || rows.length < 2) return '';
		return formatDateRange(
			new Date(rows[0].time),
			new Date(rows[rows.length - 1].time),
			ianaTimeZone
		);
	});

	/** @param {number} availability */
	function availabilityTitle(availability) {
		const base = `Availability ${fmt0.format(availability)}%`;
		return availabilityRange ? `${base} · ${availabilityRange}` : base;
	}

	/** @param {string | null | undefined} status */
	function statusLabel(status) {
		if (!status) return 'Operating';
		return status.charAt(0).toUpperCase() + status.slice(1);
	}

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
				{@const availability = availabilityByUnit?.[unit.code]}
				<li>
					<button
						type="button"
						class="group flex w-full cursor-pointer items-center gap-5 px-6 py-3 text-left transition-colors hover:bg-light-warm-grey"
						onclick={() => (selectedCode = unit.code)}
					>
						<span class="flex shrink-0 justify-center" title={statusLabel(unit.status_id)}>
							<FacilityStatusIcon status={unit.status_id} isCommissioning={unit.isCommissioning} />
							<span class="sr-only">{statusLabel(unit.status_id)}</span>
						</span>

						<span class="min-w-0 flex-1">
							<!-- Sub-row 1: unit code + capacity -->
							<span class="flex items-baseline justify-between gap-3">
								<span class="truncate font-mono text-sm font-medium text-dark-grey">
									{unit.code_display ?? unit.code}
								</span>
								<span class="shrink-0 font-mono text-sm text-dark-grey">
									{formatCapacity(unit.capacity_maximum || unit.capacity_registered)}
									<span class="text-xs text-mid-grey">MW</span>
								</span>
							</span>

							<!-- Sub-row 2: fuel tech tag (unit's series colour), storage,
							     availability bar + % -->
							<span class="mt-1 flex items-center justify-between gap-3">
								<span
									class="inline-block min-w-0 truncate rounded px-1.5 py-0.5 text-xxs font-medium {isDarkText
										? 'text-black'
										: 'text-white'}"
									style="background-color: {bgColor};"
								>
									{fuelTechNameMap[unit.fueltech_id] || unit.fueltech_id}
								</span>

								{#if unit.capacity_storage}
									<span class="shrink-0 font-mono text-xs text-dark-grey" title="Storage Capacity">
										{formatCapacity(unit.capacity_storage)}
										<span class="text-xxs text-mid-grey">MWh</span>
									</span>
								{/if}

								{#if showAvailability}
									<!-- Fixed-width cluster so bars + percentages align across rows.
									     Track uses warm-grey (not light-warm-grey) so it stays visible
									     against the row's hover background. Fill picks up the unit's
									     series colour, tying each bar to its line in the chart. -->
									<span
										class="flex w-28 shrink-0 items-center gap-1.5"
										title={availability !== undefined ? availabilityTitle(availability) : undefined}
									>
										{#if availability !== undefined}
											<span class="h-1.5 flex-1 overflow-hidden rounded-full bg-warm-grey">
												<span
													class="block h-full rounded-full"
													style="width: {availability}%; background-color: {bgColor};"
												></span>
											</span>
											<span class="w-7 shrink-0 text-right font-mono text-xxs text-dark-grey">
												{fmt0.format(availability)}%
											</span>
										{:else}
											<span class="w-full text-right text-xxs text-mid-warm-grey">—</span>
										{/if}
									</span>
								{/if}
							</span>
						</span>

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
