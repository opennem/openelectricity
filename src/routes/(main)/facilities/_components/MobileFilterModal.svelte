<script>
	import FormMultiSelect from '$lib/components/form-elements/MultiSelect.svelte';
	import HierarchicalMultiSelect from './HierarchicalMultiSelect.svelte';
	import RangeSlider from '$lib/components/ui/range-slider/RangeSlider.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Button from '$lib/components/form-elements/Button2.svelte';
	import IconAdjustmentsHorizontal from '$lib/icons/AdjustmentsHorizontal.svelte';

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
	 *   onclose: () => void,
	 *   onregionschange: (values: string[] | string, isMetaPressed: boolean) => void,
	 *   onstatuseschange: (values: string[], isMetaPressed: boolean) => void,
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
		onclose,
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

	let isCapacityFiltered = $derived(capacityRange[0] > capacityMin || capacityRange[1] < capacityMax);
	let isYearFiltered = $derived(yearRange[0] > yearMin || yearRange[1] < yearMax);
</script>

{#if open}
	<Modal
		maxWidthClass=""
		class="fixed! bg-white top-0 bottom-0 left-0 right-0 overflow-y-auto overscroll-contain rounded-none! my-0! pt-0 px-0 z-50"
	>
		<header
			class="sticky top-0 z-50 bg-white pb-2 pt-6 px-10 flex justify-between items-center border-b border-warm-grey"
		>
			<h3 class="mb-2">Filters</h3>

			<div class="mb-2">
				<IconAdjustmentsHorizontal class="size-10" />
			</div>
		</header>

		<section class="p-10 pb-12 w-full flex flex-col gap-8">
			<HierarchicalMultiSelect
				options={regionOptions}
				selected={selectedRegions}
				label="Region"
				paddingX=""
				staticDisplay={true}
				defaultExpanded={['nem']}
				onchange={(value, isMetaPressed) => onregionschange(value, isMetaPressed)}
				onclear={onclearregions}
			/>

			<FormMultiSelect
				options={statusOptions}
				selected={selectedStatuses}
				label="Status"
				withColours={true}
				paddingX=""
				staticDisplay={true}
				onchange={(value, isMetaPressed) => onstatuseschange([value], isMetaPressed)}
				onclear={onclearstatuses}
			/>

			<HierarchicalMultiSelect
				options={fuelTechOptions}
				selected={selectedFuelTechs}
				label="Technology"
				paddingX=""
				staticDisplay={true}
				onchange={(value, isMetaPressed) => onfueltechschange(value, isMetaPressed)}
				onclear={onclearfueltechs}
			/>

			<div class="flex flex-col gap-2">
				<div class="flex items-center justify-between">
					<span class="text-sm font-medium text-dark-grey">Capacity</span>
					{#if isCapacityFiltered}
						<button
							type="button"
							class="text-xs text-mid-grey hover:text-dark-grey transition-colors cursor-pointer"
							onclick={onclearcapacity}
						>
							Clear
						</button>
					{/if}
				</div>
				<RangeSlider
					min={capacityMin}
					max={capacityMax}
					value={capacityRange}
					step={10}
					onchange={oncapacityrangechange}
					formatValue={formatCapacity}
				/>
			</div>

			<div class="flex flex-col gap-2">
				<div class="flex items-center justify-between">
					<span class="text-sm font-medium text-dark-grey">Year</span>
					{#if isYearFiltered}
						<button
							type="button"
							class="text-xs text-mid-grey hover:text-dark-grey transition-colors cursor-pointer"
							onclick={onclearyears}
						>
							Clear
						</button>
					{/if}
				</div>
				<RangeSlider
					min={yearMin}
					max={yearMax}
					value={yearRange}
					step={1}
					onchange={onyearrangechange}
					formatValue={(v) => String(v)}
				/>
			</div>
		</section>

		{#snippet buttons()}
			<div class="flex gap-3">
				<Button class="bg-dark-grey! text-white hover:bg-black! w-full" onclick={onclose}
					>Close</Button
				>
			</div>
		{/snippet}
	</Modal>
{/if}
