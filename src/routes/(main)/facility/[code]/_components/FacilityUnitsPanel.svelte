<script>
	import { ChevronRight } from '@lucide/svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import FacilityStatusIcon from '$lib/components/facilities/FacilityStatusIcon.svelte';
	import { Sheet } from '$lib/components/ui/sheet';
	import { getFueltechColor, needsDarkText } from '$lib/utils/fueltech-display';
	import { fuelTechNameMap } from '$lib/fuel_techs';
	import { formatCapacity, getNumberFormat } from '$lib/utils/formatters';
	import { formatDateRange } from '$lib/components/charts/v2';
	import { buildUnitColourMap } from '$lib/components/charts/facility/helpers.js';
	import { sortUnitsForDisplay } from '$lib/components/charts/facility/unit-analysis.js';
	import { getPrimaryFuelTechGroup } from '$lib/components/charts/facility/metrics/fuel-group.js';
	import {
		isSubDailyData,
		computeUnitAvailability
	} from '$lib/components/charts/facility/metrics/metrics-calc.js';
	import UnitDetail from './UnitDetail.svelte';
	import SwitchTabs from '$lib/components/SwitchTabs.svelte';
	import { ianaFromOffset } from '$lib/components/charts/v2/network-time.js';

	/**
	 * `intervalData` is the generation chart's visible-range power data
	 * (`FacilityChart` `onvisibledata`) — it feeds the per-unit availability bars
	 * for coal facilities, so the bars track the chart's current date range.
	 *
	 * `hiddenUnitCodes`/`ontoggleunit` drive the per-unit chart-series toggles:
	 * each row's colour swatch toggles that unit in the page's charts, while the
	 * rest of the row still opens the unit detail sheet.
	 *
	 * `batteryMode`/`showBatteryModeSwitch`/`onbatterymodechange` expose the
	 * battery Net ⇄ Charge/Discharge view switch for facilities with a
	 * bidirectional battery unit plus derived split units.
	 * @type {{
	 *   facility?: any | null,
	 *   sanityFacility?: any | null,
	 *   timeZone?: string,
	 *   intervalData?: { data: any[], seriesNames: string[] } | null,
	 *   hiddenUnitCodes?: string[],
	 *   ontoggleunit?: (code: string) => void,
	 *   batteryMode?: 'net' | 'split',
	 *   showBatteryModeSwitch?: boolean,
	 *   onbatterymodechange?: (mode: string) => void
	 * }}
	 */
	let {
		facility = null,
		sanityFacility = null,
		timeZone = '+10:00',
		intervalData = null,
		hiddenUnitCodes = [],
		ontoggleunit = undefined,
		batteryMode = 'net',
		showBatteryModeSwitch = false,
		onbatterymodechange = undefined
	} = $props();

	const fmt0 = getNumberFormat(0);

	// Canonical display order, top-of-stack first — the same sort the chart
	// pipeline uses, so the panel always mirrors the chart paint order.
	let units = $derived(
		/** @type {any[]} */ (sortUnitsForDisplay(facility?.units ?? [], { reverse: true }))
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

	let ianaTimeZone = $derived(ianaFromOffset(timeZone));

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

	// The selected unit lives in the URL (?unit=CODE) so a unit view is
	// shareable and deep-links straight to the open sheet. Updates use `goto`
	// with replaceState — SvelteKit's shallow `replaceState()` doesn't update
	// the reactive `page.url`, and no load function here reads the URL, so the
	// navigation is a cheap client-side URL swap (no refetch, no history spam).
	// Tracking by code (not object) means switching facility via the picker
	// re-derives against the new unit list and closes the sheet if the code
	// is gone, rather than stranding a stale unit object in the panel.
	let selectedCode = $derived(page.url.searchParams.get('unit'));
	let selectedUnit = $derived(
		selectedCode ? (units.find((u) => u.code === selectedCode) ?? null) : null
	);

	/** @param {string | null} code */
	function setSelectedCode(code) {
		const url = new URL(page.url);
		if (code) url.searchParams.set('unit', code);
		else url.searchParams.delete('unit');
		goto(`${url.pathname}${url.search}`, { replaceState: true, noScroll: true, keepFocus: true });
	}
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
		<div class="flex items-center justify-between gap-3 border-b border-mid-warm-grey/40 px-6 py-3">
			<h3 class="m-0 text-sm font-semibold text-dark-grey">Units</h3>
			<div class="flex items-center gap-3">
				{#if showBatteryModeSwitch}
					<SwitchTabs
						buttons={[
							{ label: 'Net', value: 'net' },
							{ label: 'Charge/Discharge', value: 'split' }
						]}
						selected={batteryMode}
						onChange={(v) => onbatterymodechange?.(v)}
					/>
				{/if}
				<span class="text-xs text-mid-grey">
					{units.length}
					{units.length === 1 ? 'unit' : 'units'}
				</span>
			</div>
		</div>

		<ol class="divide-y divide-mid-warm-grey/40">
			{#each units as unit (unit.code)}
				{@const bgColor = colours[unit.code] || getFueltechColor(unit.fueltech_id)}
				{@const isDarkText = needsDarkText(unit.fueltech_id)}
				{@const availability = availabilityByUnit?.[unit.code]}
				{@const isHidden = hiddenUnitCodes.includes(unit.code)}
				{@const unitLabel = unit.code_display ?? unit.code}
				<!-- Two sibling buttons per row (nesting them would be invalid HTML):
				     the colour swatch toggles the unit's chart series, the rest of the
				     row opens the unit detail sheet. Hover lives on the <li> so the
				     whole row highlights either way. -->
				<li class="flex items-center gap-3 pl-5 transition-colors hover:bg-light-warm-grey">
					{#if ontoggleunit}
						<!-- Generous hit area (44px) around the swatch so it's easy to tap. -->
						<button
							type="button"
							class="flex size-11 shrink-0 cursor-pointer items-center justify-center"
							aria-pressed={!isHidden}
							aria-label="Toggle {unitLabel} in charts"
							title="{isHidden ? 'Show' : 'Hide'} {unitLabel} in charts"
							onclick={() => ontoggleunit(unit.code)}
						>
							<span
								class="size-6 rounded-[4px] border-2 transition-colors"
								style:border-color={bgColor}
								style:background-color={isHidden ? 'transparent' : bgColor}
							></span>
						</button>
					{/if}
					<button
						type="button"
						class="group flex min-w-0 flex-1 cursor-pointer items-center gap-5 py-3 pr-6 text-left transition-opacity {isHidden
							? 'opacity-50'
							: ''}"
						onclick={() => setSelectedCode(unit.code)}
					>
						<span class="flex shrink-0 justify-center" title={statusLabel(unit.status_id)}>
							<FacilityStatusIcon status={unit.status_id} isCommissioning={unit.isCommissioning} />
							<span class="sr-only">{statusLabel(unit.status_id)}</span>
						</span>

						<span class="min-w-0 flex-1">
							<!-- Sub-row 1: unit code + capacity -->
							<span class="flex items-baseline justify-between gap-3">
								<span class="truncate font-mono text-sm font-medium text-dark-grey">
									{unitLabel}
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
		onclose={() => setSelectedCode(null)}
	>
		{#if selectedUnit}
			<UnitDetail unit={selectedUnit} {facility} sanityUnit={selectedSanityUnit} {timeZone} />
		{/if}
	</Sheet>
{/if}
