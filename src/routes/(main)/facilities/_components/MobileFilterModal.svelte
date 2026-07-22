<script>
	import { untrack } from 'svelte';
	import { X } from '@lucide/svelte';

	import { BottomSheet } from '$lib/components/ui/bottom-sheet';
	import RangeSlider from '$lib/components/ui/range-slider/RangeSlider.svelte';
	import SearchInput from './SearchInput.svelte';
	import FilterAccordionSection from './filters/FilterAccordionSection.svelte';
	import FilterOptionList from './filters/FilterOptionList.svelte';
	import {
		getSelectedLabels,
		activeLeafCount,
		toggleInSelection
	} from '$lib/facilities/filter-options.js';
	import { regionShortLabels } from '$lib/facilities/filters.js';

	/**
	 * Mobile filter sheet. Like the desktop dropdowns, every control edits a
	 * LOCAL DRAFT — nothing applies until the footer's Apply button commits
	 * all changed drafts at once (via the onapply* callbacks) and closes.
	 * Dismissing the sheet any other way discards the drafts; they re-seed
	 * from the committed props on the next open.
	 * @type {{
	 *   open: boolean,
	 *   typeTitle?: string,
	 *   typeOptions?: Array<{label: string, value: string, colour?: string}>,
	 *   typeExpanded?: string[],
	 *   regionOptions: Array<{label: string, value: string, children?: Array<{label: string, value: string}>}>,
	 *   statusOptions: Array<{label: string, value: string, colour?: string}>,
	 *   typeDefaults?: string[],
	 *   statusDefaults?: string[],
	 *   regionDefaults?: string[],
	 *   selectedTypes?: string[],
	 *   selectedRegions: string[],
	 *   selectedStatuses: string[],
	 *   capacityRange: [number, number],
	 *   capacityMin: number,
	 *   capacityMax: number,
	 *   formatCapacity: (val: number) => string,
	 *   onclose: () => void,
	 *   onapplytypes?: (values: string[]) => void,
	 *   onapplystatuses?: (values: string[]) => void,
	 *   onapplyregions?: (values: string[]) => void,
	 *   onapplycapacity?: (range: [number, number]) => void,
	 *   onapplyyears?: (range: [number, number]) => void,
	 *   typeRow?: import('svelte').Snippet<[import('$lib/facilities/filter-options.js').FilterOption, any]>,
	 *   yearRange: [number, number],
	 *   yearMin: number,
	 *   yearMax: number
	 * }}
	 */
	let {
		open,
		typeTitle = 'Type',
		typeOptions = [],
		typeExpanded = [],
		regionOptions,
		statusOptions,
		typeDefaults = [],
		statusDefaults = [],
		regionDefaults = [],
		selectedTypes = [],
		selectedRegions,
		selectedStatuses,
		capacityRange,
		capacityMin,
		capacityMax,
		formatCapacity,
		onclose,
		onapplytypes,
		onapplystatuses,
		onapplyregions,
		onapplycapacity,
		onapplyyears,
		typeRow,
		yearRange,
		yearMin,
		yearMax
	} = $props();

	let techSearchTerm = $state('');

	// The staged selections while the sheet is open — seeded from the
	// committed props each time it opens, discarded on dismiss.
	/** @type {string[]} */
	let draftTypes = $state([]);
	/** @type {string[]} */
	let draftStatuses = $state([]);
	/** @type {string[]} */
	let draftRegions = $state([]);
	/** @type {[number, number]} */
	let draftCapacity = $state([0, 10000]);
	/** @type {[number, number]} */
	let draftYears = $state([1900, 2040]);

	$effect(() => {
		if (!open) return;
		untrack(() => {
			draftTypes = [...selectedTypes];
			draftStatuses = [...selectedStatuses];
			draftRegions = [...selectedRegions];
			draftCapacity = [capacityRange[0], capacityRange[1]];
			draftYears = [yearRange[0], yearRange[1]];
			techSearchTerm = '';
		});
	});

	/** Reset every draft to its default — committed only when Apply is hit. */
	function resetDrafts() {
		draftTypes = [...typeDefaults];
		draftStatuses = [...statusDefaults];
		draftRegions = [...regionDefaults];
		draftCapacity = [capacityMin, capacityMax];
		draftYears = [yearMin, yearMax];
	}

	/** Commit every changed draft, then close. Client-side range commits go
	 * first (replaceState); the selection commits follow, so a final
	 * navigation's buildUrl reads everything back from updated state. The
	 * parent's apply handlers drop unchanged selections themselves. */
	function applyAll() {
		if (draftCapacity[0] !== capacityRange[0] || draftCapacity[1] !== capacityRange[1]) {
			onapplycapacity?.([draftCapacity[0], draftCapacity[1]]);
		}
		if (draftYears[0] !== yearRange[0] || draftYears[1] !== yearRange[1]) {
			onapplyyears?.([draftYears[0], draftYears[1]]);
		}
		onapplyregions?.(draftRegions);
		onapplystatuses?.(draftStatuses);
		onapplytypes?.(draftTypes);
		onclose();
	}

	// Under "ticked = shown", counts and tags only surface when a DRAFT
	// deviates from its default (count 0 = at default) — otherwise a fresh
	// sheet reads as filtered.
	let typeCount = $derived(activeLeafCount(typeOptions, draftTypes, typeDefaults));
	let statusCount = $derived(activeLeafCount(statusOptions, draftStatuses, statusDefaults));
	let regionCount = $derived(activeLeafCount(regionOptions, draftRegions, regionDefaults));

	let isCapacityFiltered = $derived(
		draftCapacity[0] > capacityMin || draftCapacity[1] < capacityMax
	);
	let isYearFiltered = $derived(draftYears[0] > yearMin || draftYears[1] < yearMax);

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
					onclick={resetDrafts}
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
				title={typeTitle}
				tags={typeCount === 0 ? [] : getSelectedLabels(typeOptions, draftTypes)}
				count={typeCount}
				clearLabel="Reset to defaults"
				onclear={() => (draftTypes = [...typeDefaults])}
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
					selected={draftTypes}
					defaultExpanded={typeExpanded}
					searchTerm={techSearchTerm}
					onchange={(value, isMetaPressed) =>
						(draftTypes = toggleInSelection(draftTypes, value, isMetaPressed))}
					row={typeRow}
				/>
			</FilterAccordionSection>

			<FilterAccordionSection
				title="Status"
				tags={statusCount === 0 ? [] : getSelectedLabels(statusOptions, draftStatuses)}
				count={statusCount}
				clearLabel="Reset to defaults"
				onclear={() => (draftStatuses = [...statusDefaults])}
			>
				<FilterOptionList
					options={statusOptions}
					selected={draftStatuses}
					onchange={(value, isMetaPressed) =>
						(draftStatuses = toggleInSelection(draftStatuses, value, isMetaPressed))}
				/>
			</FilterAccordionSection>

			<FilterAccordionSection
				title="Region"
				tags={regionCount === 0
					? []
					: getSelectedLabels(regionOptions, draftRegions, {
							labelMap: regionShortLabels
						})}
				count={regionCount}
				clearLabel="Reset to defaults"
				onclear={() => (draftRegions = [...regionDefaults])}
			>
				<FilterOptionList
					options={regionOptions}
					selected={draftRegions}
					defaultExpanded={['nem']}
					onchange={(value, isMetaPressed) =>
						(draftRegions = toggleInSelection(draftRegions, value, isMetaPressed))}
				/>
			</FilterAccordionSection>

			{@render rangeSection({
				title: 'Capacity',
				isFiltered: isCapacityFiltered,
				bordered: true,
				onclear: () => (draftCapacity = [capacityMin, capacityMax]),
				min: capacityMin,
				max: capacityMax,
				value: draftCapacity,
				step: 10,
				formatValue: formatCapacity,
				onchange: (range) => (draftCapacity = range)
			})}

			{@render rangeSection({
				title: 'Commissioned',
				isFiltered: isYearFiltered,
				bordered: false,
				onclear: () => (draftYears = [yearMin, yearMax]),
				min: yearMin,
				max: yearMax,
				value: draftYears,
				step: 1,
				formatValue: (v) => String(v),
				onchange: (range) => (draftYears = range)
			})}
		</section>

		{#snippet footer()}
			<footer class="shrink-0 border-t border-warm-grey bg-white p-4">
				<button
					type="button"
					class="w-full bg-dark-grey text-white rounded-lg py-4 text-sm font-medium hover:bg-black transition-colors cursor-pointer"
					onclick={applyAll}
				>
					Apply filters
				</button>
			</footer>
		{/snippet}
	</BottomSheet>
</div>
