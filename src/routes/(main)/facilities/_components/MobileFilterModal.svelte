<script>
	import FormMultiSelect from '$lib/components/form-elements/MultiSelect.svelte';
	import HierarchicalMultiSelect from './HierarchicalMultiSelect.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Button from '$lib/components/form-elements/Button2.svelte';
	import IconAdjustmentsHorizontal from '$lib/icons/AdjustmentsHorizontal.svelte';

	/**
	 * @type {{
	 *   open: boolean,
	 *   regionOptions: Array<{label: string, value: string, divider?: boolean, labelClassName?: string}>,
	 *   statusOptions: Array<{label: string, value: string, colour?: string}>,
	 *   fuelTechOptions: Array<{label: string, value: string, colour?: string, children?: Array<{label: string, value: string, colour?: string}>}>,
	 *   sizeOptions: Array<{label: string, value: string}>,
	 *   selectedRegions: string[],
	 *   selectedStatuses: string[],
	 *   selectedFuelTechs: string[],
	 *   selectedSizes: string[],
	 *   onclose: () => void,
	 *   onregionschange: (values: string[], isMetaPressed: boolean) => void,
	 *   onstatuseschange: (values: string[], isMetaPressed: boolean) => void,
	 *   onfueltechschange: (values: string[] | string, isMetaPressed: boolean) => void,
	 *   onsizeschange: (values: string[], isMetaPressed: boolean) => void,
	 *   onclearregions: () => void,
	 *   onclearstatuses: () => void,
	 *   onclearfueltechs: () => void,
	 *   onclearsizes: () => void
	 * }}
	 */
	let {
		open,
		regionOptions,
		statusOptions,
		fuelTechOptions,
		sizeOptions,
		selectedRegions,
		selectedStatuses,
		selectedFuelTechs,
		selectedSizes,
		onclose,
		onregionschange,
		onstatuseschange,
		onfueltechschange,
		onsizeschange,
		onclearregions,
		onclearstatuses,
		onclearfueltechs,
		onclearsizes
	} = $props();
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

		<section class="p-10 pb-0 w-full flex flex-col gap-5">
			<div class="grid grid-cols-2 gap-10">
				<FormMultiSelect
					options={regionOptions}
					selected={selectedRegions}
					label="Region"
					paddingX=""
					staticDisplay={true}
					onchange={(value, isMetaPressed) => onregionschange([value], isMetaPressed)}
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
			</div>

			<div class="grid grid-cols-3 gap-10">
				<div class="col-span-2">
					<HierarchicalMultiSelect
						options={fuelTechOptions}
						selected={selectedFuelTechs}
						label="Technology"
						paddingX=""
						staticDisplay={true}
						onchange={(value, isMetaPressed) => onfueltechschange(value, isMetaPressed)}
						onclear={onclearfueltechs}
					/>
				</div>

				<FormMultiSelect
					options={sizeOptions}
					selected={selectedSizes}
					label="Size"
					paddingX=""
					staticDisplay={true}
					onchange={(value, isMetaPressed) => onsizeschange([value], isMetaPressed)}
					onclear={onclearsizes}
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
