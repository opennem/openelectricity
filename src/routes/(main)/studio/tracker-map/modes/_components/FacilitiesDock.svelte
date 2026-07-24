<script>
	/**
	 * Facilities-mode dock content — deliberately light.
	 *
	 * A compact detail stub for the selected facility (with the grid-context
	 * cross-link back to grid mode) above a region-filtered facility list.
	 * Clicking a row selects on the map (and toggles off when re-clicked);
	 * full detail lives on the real `/facility/[code]` page.
	 *
	 * `facilities` arrives as a plain (non-proxied) array — the page holds the
	 * large dataset in `$state.raw`, so per-keystroke deep reactivity never
	 * touches it.
	 */
	import { ArrowRight, X } from '@lucide/svelte';
	import { getFueltechColor, needsDarkText } from '$lib/utils/fueltech-display.js';
	import { getFacilityCapacity } from '$lib/facilities/units.js';
	import { fuelTechName } from '$lib/fuel_techs.js';
	import { getNumberFormat } from '$lib/utils/formatters';

	/**
	 * @type {{
	 *   facilities?: any[],
	 *   loading?: boolean,
	 *   error?: string | null,
	 *   regionFilter?: string | undefined,
	 *   selectedFacility?: any,
	 *   onselect?: (facility: any | null) => void,
	 *   ongridcontext?: (regionCode: string) => void
	 * }}
	 */
	let {
		facilities = [],
		loading = false,
		error = null,
		regionFilter = undefined,
		selectedFacility = null,
		onselect = undefined,
		ongridcontext = undefined
	} = $props();

	const mwFormatter = getNumberFormat(0);

	/**
	 * Most common unit fuel tech for a facility — id form, for badge label +
	 * colour (mirrors `primaryFuelTechColour`, which only returns the colour).
	 * Empty string when the facility carries no fuel tech.
	 * @param {any} facility
	 * @returns {import('$lib/types/fuel_tech.types').FuelTechCode | ''}
	 */
	function primaryFuelTechId(facility) {
		/** @type {Record<string, number>} */
		const counts = {};
		for (const unit of facility.units ?? []) {
			if (unit.fueltech_id) counts[unit.fueltech_id] = (counts[unit.fueltech_id] || 0) + 1;
		}
		let maxFt = '';
		let maxCount = 0;
		for (const [ft, count] of Object.entries(counts)) {
			if (count > maxCount) {
				maxCount = count;
				maxFt = ft;
			}
		}
		return /** @type {import('$lib/types/fuel_tech.types').FuelTechCode | ''} */ (maxFt);
	}

	let filtered = $derived.by(() => {
		const list = regionFilter
			? facilities.filter((f) => f.network_region === regionFilter)
			: facilities;
		return [...list].sort((a, b) => getFacilityCapacity(b) - getFacilityCapacity(a));
	});

	/** @param {any} facility */
	function handleRowClick(facility) {
		onselect?.(selectedFacility?.code === facility.code ? null : facility);
	}
</script>

<div class="flex flex-col gap-3">
	{#if selectedFacility}
		{@const detailFt = primaryFuelTechId(selectedFacility)}
		<div class="rounded-lg border border-warm-grey bg-white p-4">
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0">
					<h3 class="text-sm font-semibold text-dark-grey m-0 truncate">
						{selectedFacility.name}
					</h3>
					<div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-mid-grey">
						<span class="font-mono">{selectedFacility.network_region}</span>
						{#if detailFt}
							<span
								class="rounded-full px-2 py-0.5 text-[10px] leading-tight"
								style:background-color={getFueltechColor(detailFt)}
								style:color={needsDarkText(detailFt) ? '#000000' : '#ffffff'}
							>
								{fuelTechName(detailFt)}
							</span>
						{/if}
						<span class="font-mono"
							>{mwFormatter.format(getFacilityCapacity(selectedFacility))} MW</span
						>
					</div>
				</div>
				<button
					class="shrink-0 p-1 rounded text-mid-warm-grey hover:text-dark-grey hover:bg-light-warm-grey"
					title="Clear selection"
					aria-label="Clear selection"
					onclick={() => onselect?.(null)}
				>
					<X class="size-4" />
				</button>
			</div>

			<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
				<a
					href="/facility/{selectedFacility.code}"
					class="inline-flex items-center gap-1 text-dark-grey underline hover:no-underline"
				>
					Full detail <ArrowRight class="size-3" />
				</a>
				<button
					class="inline-flex items-center gap-1 text-dark-grey underline hover:no-underline"
					onclick={() => ongridcontext?.(selectedFacility.network_region)}
				>
					Grid context: {selectedFacility.network_region}
					<ArrowRight class="size-3" />
				</button>
			</div>
		</div>
	{/if}

	{#if loading}
		<p class="text-sm text-mid-grey px-1 m-0">Loading facilities…</p>
	{:else if error}
		<p class="text-sm text-red px-1 m-0">{error}</p>
	{:else if filtered.length === 0}
		<p class="text-sm text-mid-grey px-1 m-0">No facilities in this region.</p>
	{:else}
		<ul
			class="m-0 p-0 list-none rounded-lg border border-warm-grey bg-white divide-y divide-light-warm-grey overflow-hidden"
		>
			{#each filtered as facility (facility.code)}
				{@const ft = primaryFuelTechId(facility)}
				{@const selected = selectedFacility?.code === facility.code}
				<li>
					<button
						class="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors {selected
							? 'bg-light-warm-grey'
							: 'hover:bg-light-warm-grey/60'}"
						onclick={() => handleRowClick(facility)}
					>
						<span
							class="size-2.5 shrink-0 rounded-full border border-black/10"
							style:background-color={ft ? getFueltechColor(ft) : '#6A6A6A'}
							title={ft ? fuelTechName(ft) : 'Unknown fuel tech'}
						></span>
						<span class="flex-1 min-w-0">
							<span class="block text-sm text-dark-grey truncate {selected ? 'font-semibold' : ''}">
								{facility.name}
							</span>
							<span class="block text-[10px] text-mid-grey font-mono">
								{facility.network_region}{ft ? ` · ${fuelTechName(ft)}` : ''}
							</span>
						</span>
						<span class="shrink-0 font-mono text-xs text-mid-grey">
							{mwFormatter.format(getFacilityCapacity(facility))} MW
						</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
