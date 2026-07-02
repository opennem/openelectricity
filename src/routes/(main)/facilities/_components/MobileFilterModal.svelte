<script>
	import { fade } from 'svelte/transition';
	import { X } from '@lucide/svelte';

	import RangeSlider from '$lib/components/ui/range-slider/RangeSlider.svelte';
	import SearchInput from './SearchInput.svelte';
	import FilterAccordionSection from './filters/FilterAccordionSection.svelte';
	import FilterOptionList from './filters/FilterOptionList.svelte';
	import FuelTechRowContent from './filters/FuelTechRowContent.svelte';
	import { countSelectedLeaves, summariseSelection } from '../_utils/filter-options.js';
	import { regionShortLabels } from '../_utils/filters.js';

	/**
	 * @type {{
	 *   open: boolean,
	 *   regionOptions: Array<{label: string, value: string, children?: Array<{label: string, value: string}>}>,
	 *   statusOptions: Array<{label: string, value: string, colour?: string}>,
	 *   fuelTechOptions: Array<{label: string, value: string, colour?: string, children?: Array<{label: string, value: string, colour?: string}>}>,
	 *   selectedRegions: string[],
	 *   selectedStatuses: string[],
	 *   selectedFuelTechs: string[],
	 *   capacityRange: [number, number],
	 *   capacityMin: number,
	 *   capacityMax: number,
	 *   formatCapacity: (val: number) => string,
	 *   filteredCount: number,
	 *   onclose: () => void,
	 *   onresetall: () => void,
	 *   onregionschange: (values: string[] | string, isMetaPressed: boolean) => void,
	 *   onstatuseschange: (values: string[] | string, isMetaPressed: boolean) => void,
	 *   onfueltechschange: (values: string[] | string, isMetaPressed: boolean) => void,
	 *   oncapacityrangechange: (range: [number, number]) => void,
	 *   onclearregions: () => void,
	 *   onclearstatuses: () => void,
	 *   onclearfueltechs: () => void,
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
		regionOptions,
		statusOptions,
		fuelTechOptions,
		selectedRegions,
		selectedStatuses,
		selectedFuelTechs,
		capacityRange,
		capacityMin,
		capacityMax,
		formatCapacity,
		filteredCount,
		onclose,
		onresetall,
		onregionschange,
		onstatuseschange,
		onfueltechschange,
		oncapacityrangechange,
		onclearregions,
		onclearstatuses,
		onclearfueltechs,
		onclearcapacity,
		yearRange,
		yearMin,
		yearMax,
		onyearrangechange,
		onclearyears
	} = $props();

	let techSearchTerm = $state('');

	let statusCount = $derived(countSelectedLeaves(statusOptions, selectedStatuses));
	let fuelTechCount = $derived(countSelectedLeaves(fuelTechOptions, selectedFuelTechs));
	let regionCount = $derived(countSelectedLeaves(regionOptions, selectedRegions));
	let activeCount = $derived(statusCount + fuelTechCount + regionCount);

	let isCapacityFiltered = $derived(
		capacityRange[0] > capacityMin || capacityRange[1] < capacityMax
	);
	let isYearFiltered = $derived(yearRange[0] > yearMin || yearRange[1] < yearMax);
</script>

{#snippet fuelTechRow(/** @type {import('../_utils/filter-options.js').FilterOption} */ option)}
	<FuelTechRowContent {option} />
{/snippet}

{#snippet rangeSection(
	/** @type {{title: string, display: string, isFiltered: boolean, bordered: boolean, onclear: () => void, min: number, max: number, value: [number, number], step: number, formatValue: (v: number) => string, onchange: (range: [number, number]) => void}} */ cfg
)}
	<div class="py-4 flex flex-col gap-3 {cfg.bordered ? 'border-b border-warm-grey' : ''}">
		<div class="flex items-center justify-between gap-3">
			<span class="font-medium text-dark-grey">{cfg.title}</span>
			<div class="flex items-center gap-3">
				{#if cfg.isFiltered}
					<button
						type="button"
						class="text-xs text-mid-grey hover:text-dark-grey underline underline-offset-2 transition-colors cursor-pointer"
						onclick={cfg.onclear}
					>
						Clear
					</button>
				{/if}
				<span class="text-sm text-dark-grey whitespace-nowrap">{cfg.display}</span>
			</div>
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

{#if open}
	<div
		class="fixed inset-0 z-50 bg-white flex flex-col overscroll-contain"
		transition:fade={{ duration: 200 }}
	>
		<!-- Header -->
		<header
			class="shrink-0 px-6 py-4 border-b border-warm-grey flex items-center justify-between gap-4"
		>
			<div class="flex items-baseline gap-3">
				<h3 class="mb-0">Filters</h3>
				{#if activeCount > 0}
					<span class="text-xs text-mid-grey whitespace-nowrap">{activeCount} active</span>
				{/if}
			</div>

			<div class="flex items-center gap-2">
				<button
					type="button"
					class="text-sm text-mid-grey hover:text-dark-grey font-medium underline underline-offset-2 px-2 transition-colors cursor-pointer"
					onclick={onresetall}
				>
					Reset
				</button>
				<button
					type="button"
					class="p-2 rounded-full bg-light-warm-grey hover:bg-warm-grey transition-colors cursor-pointer"
					onclick={onclose}
					aria-label="Close filters"
				>
					<X class="size-5 text-dark-grey" />
				</button>
			</div>
		</header>

		<!-- Filter sections -->
		<section class="flex-1 overflow-y-auto px-6">
			<FilterAccordionSection
				title="Status"
				summary={summariseSelection(statusOptions, selectedStatuses)}
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
				title="Technology"
				summary={summariseSelection(fuelTechOptions, selectedFuelTechs)}
				count={fuelTechCount}
				onclear={onclearfueltechs}
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
					options={fuelTechOptions}
					selected={selectedFuelTechs}
					searchTerm={techSearchTerm}
					onchange={onfueltechschange}
					row={fuelTechRow}
				/>
			</FilterAccordionSection>

			<FilterAccordionSection
				title="Region"
				summary={summariseSelection(regionOptions, selectedRegions, {
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
				display: `${formatCapacity(capacityRange[0])} – ${formatCapacity(capacityRange[1])}${capacityRange[1] >= capacityMax ? '+' : ''}`,
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
				display: `${yearRange[0]} – ${yearRange[1]}`,
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

		<!-- Sticky footer -->
		<footer class="shrink-0 border-t border-warm-grey bg-white p-4">
			<button
				type="button"
				class="w-full bg-dark-grey text-white rounded-lg py-4 font-medium hover:bg-black transition-colors cursor-pointer"
				onclick={onclose}
			>
				Show {filteredCount.toLocaleString()}
				{filteredCount === 1 ? 'facility' : 'facilities'}
			</button>
		</footer>
	</div>
{/if}
