<script>
	import { X } from '@lucide/svelte';

	import { BottomSheet } from '$lib/components/ui/bottom-sheet';
	import RangeSlider from '$lib/components/ui/range-slider/RangeSlider.svelte';
	import SearchInput from './SearchInput.svelte';
	import FilterAccordionSection from './filters/FilterAccordionSection.svelte';
	import FilterOptionList from './filters/FilterOptionList.svelte';
	import { getSelectedLabels } from '$lib/facilities/filter-options.js';
	import { regionShortLabels } from '$lib/facilities/filters.js';

	/**
	 * @type {{
	 *   open: boolean,
	 *   typeOptions?: Array<{label: string, value: string, colour?: string}>,
	 *   regionOptions: Array<{label: string, value: string, children?: Array<{label: string, value: string}>}>,
	 *   statusOptions: Array<{label: string, value: string, colour?: string}>,
	 *   typeCount?: number,
	 *   statusCount?: number,
	 *   regionCount?: number,
	 *   selectedTypes?: string[],
	 *   selectedRegions: string[],
	 *   selectedStatuses: string[],
	 *   capacityRange: [number, number],
	 *   capacityMin: number,
	 *   capacityMax: number,
	 *   formatCapacity: (val: number) => string,
	 *   filteredCount: number,
	 *   onclose: () => void,
	 *   onresetall: () => void,
	 *   ontypeschange?: (values: string[] | string, isMetaPressed: boolean) => void,
	 *   oncleartypes?: () => void,
	 *   typeRow?: import('svelte').Snippet<[import('$lib/facilities/filter-options.js').FilterOption, any]>,
	 *   onregionschange: (values: string[] | string, isMetaPressed: boolean) => void,
	 *   onstatuseschange: (values: string[] | string, isMetaPressed: boolean) => void,
	 *   oncapacityrangechange: (range: [number, number]) => void,
	 *   onclearregions: () => void,
	 *   onclearstatuses: () => void,
	 *   onclearcapacity: () => void,
	 *   yearRange: [number, number],
	 *   yearMin: number,
	 *   yearMax: number,
	 *   onyearrangechange: (range: [number, number]) => void,
	 *   onclearyears: () => void
	 * }}
	 */
	let {
		open,
		typeOptions = [],
		regionOptions,
		statusOptions,
		// Deviation-aware active counts, computed once by Filters.svelte (0 = at
		// default; an empty nothing-shown selection counts 1).
		typeCount = 0,
		statusCount = 0,
		regionCount = 0,
		selectedTypes = [],
		selectedRegions,
		selectedStatuses,
		capacityRange,
		capacityMin,
		capacityMax,
		formatCapacity,
		filteredCount,
		onclose,
		onresetall,
		ontypeschange,
		oncleartypes,
		typeRow,
		onregionschange,
		onstatuseschange,
		oncapacityrangechange,
		onclearregions,
		onclearstatuses,
		onclearcapacity,
		yearRange,
		yearMin,
		yearMax,
		onyearrangechange,
		onclearyears
	} = $props();

	let techSearchTerm = $state('');

	// Under "ticked = shown", counts and tags only surface when a filter
	// deviates from its default (count 0 = at default) — otherwise a fresh
	// page reads as filtered.
	let typeIsDefault = $derived(typeCount === 0);
	let statusIsDefault = $derived(statusCount === 0);
	let regionIsDefault = $derived(regionCount === 0);

	let isCapacityFiltered = $derived(
		capacityRange[0] > capacityMin || capacityRange[1] < capacityMax
	);
	let isYearFiltered = $derived(yearRange[0] > yearMin || yearRange[1] < yearMax);

	// The sheet anchors to this full-viewport wrapper (kept mounted so the
	// sheet's own open/close fly transition can play).
	let containerHeight = $state(0);

	// The sheet opens at its expanded height with no intermediate snap — the
	// peek matches the full fraction, so any downward drag either settles back
	// here or (past the dismiss line) closes. A sliver of map stays visible.
	const SHEET_FRACTION = 0.94;
</script>

{#snippet rangeSection(
	/** @type {{title: string, isFiltered: boolean, bordered: boolean, onclear: () => void, min: number, max: number, value: [number, number], step: number, formatValue: (v: number) => string, onchange: (range: [number, number]) => void}} */ cfg
)}
	<div class="py-4 flex flex-col gap-3 {cfg.bordered ? 'border-b border-warm-grey' : ''}">
		<div class="flex items-center justify-between gap-3">
			<span class="font-space font-medium text-xs uppercase text-dark-grey">{cfg.title}</span>
			{#if cfg.isFiltered}
				<button
					type="button"
					class="text-xs text-mid-grey hover:text-dark-grey underline underline-offset-2 transition-colors cursor-pointer"
					onclick={cfg.onclear}
				>
					Clear
				</button>
			{/if}
		</div>
		<RangeSlider
			min={cfg.min}
			max={cfg.max}
			value={cfg.value}
			step={cfg.step}
			onchange={cfg.onchange}
			formatValue={cfg.formatValue}
		/>
	</div>
{/snippet}

<!-- Full-viewport anchor for the sheet — kept mounted (pointer-events-none) so
     the sheet's fly in/out transition can play; only the sheet itself is
     interactive. A strip of map stays visible above it, like the facility
     detail sheet, and the grip supports pull-down to close. -->
<div
	class="tablet:hidden fixed inset-0 z-50 pointer-events-none"
	bind:clientHeight={containerHeight}
>
	<BottomSheet
		{open}
		{onclose}
		{containerHeight}
		peekFraction={SHEET_FRACTION}
		fullFraction={SHEET_FRACTION}
		class="pointer-events-auto"
	>
		{#snippet header()}
			<div
				class="shrink-0 px-6 pt-2 pb-4 border-b border-warm-grey grid grid-cols-[1fr_auto_1fr] items-center gap-2"
			>
				<button
					type="button"
					class="justify-self-start text-sm text-mid-grey hover:text-dark-grey font-medium underline underline-offset-2 transition-colors cursor-pointer"
					onclick={onresetall}
				>
					Reset
				</button>
				<h3 class="mb-0 text-base">Filters</h3>
				<button
					type="button"
					class="justify-self-end p-2 rounded-full bg-light-warm-grey hover:bg-warm-grey transition-colors cursor-pointer"
					onclick={onclose}
					aria-label="Close filters"
				>
					<X class="size-5 text-dark-grey" />
				</button>
			</div>
		{/snippet}

		<!-- Filter sections -->
		<section class="px-6">
			<FilterAccordionSection
				title="Type"
				tags={typeIsDefault ? [] : getSelectedLabels(typeOptions, selectedTypes)}
				count={typeCount}
				clearLabel="Reset to defaults"
				onclear={oncleartypes}
			>
				<div class="pb-3">
					<SearchInput
						value={techSearchTerm}
						placeholder="Search technologies"
						compact
						debounceMs={100}
						onchange={(value) => (techSearchTerm = value)}
						class="w-full"
					/>
				</div>
				<FilterOptionList
					options={typeOptions}
					selected={selectedTypes}
					defaultExpanded={['generators', 'loads']}
					searchTerm={techSearchTerm}
					onchange={ontypeschange}
					row={typeRow}
				/>
			</FilterAccordionSection>

			<FilterAccordionSection
				title="Status"
				tags={statusIsDefault ? [] : getSelectedLabels(statusOptions, selectedStatuses)}
				count={statusCount}
				clearLabel="Reset to defaults"
				onclear={onclearstatuses}
			>
				<FilterOptionList
					options={statusOptions}
					selected={selectedStatuses}
					onchange={onstatuseschange}
				/>
			</FilterAccordionSection>

			<FilterAccordionSection
				title="Region"
				tags={regionIsDefault
					? []
					: getSelectedLabels(regionOptions, selectedRegions, {
							labelMap: regionShortLabels
						})}
				count={regionCount}
				onclear={onclearregions}
			>
				<FilterOptionList
					options={regionOptions}
					selected={selectedRegions}
					defaultExpanded={['nem']}
					onchange={onregionschange}
				/>
			</FilterAccordionSection>

			{@render rangeSection({
				title: 'Capacity',
				isFiltered: isCapacityFiltered,
				bordered: true,
				onclear: onclearcapacity,
				min: capacityMin,
				max: capacityMax,
				value: capacityRange,
				step: 10,
				formatValue: formatCapacity,
				onchange: oncapacityrangechange
			})}

			{@render rangeSection({
				title: 'Commissioned',
				isFiltered: isYearFiltered,
				bordered: false,
				onclear: onclearyears,
				min: yearMin,
				max: yearMax,
				value: yearRange,
				step: 1,
				formatValue: (v) => String(v),
				onchange: onyearrangechange
			})}
		</section>

		{#snippet footer()}
			<footer class="shrink-0 border-t border-warm-grey bg-white p-4">
				<button
					type="button"
					class="w-full bg-dark-grey text-white rounded-lg py-4 text-sm font-medium hover:bg-black transition-colors cursor-pointer"
					onclick={onclose}
				>
					Show {filteredCount.toLocaleString()}
					{filteredCount === 1 ? 'facility' : 'facilities'}
				</button>
			</footer>
		{/snippet}
	</BottomSheet>
</div>
