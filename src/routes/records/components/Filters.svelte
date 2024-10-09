<script>
	import { getContext } from 'svelte';
	import FormMultiSelect from '$lib/components/form-elements/MultiSelect.svelte';
	import Switch from '$lib/components/SwitchWithIcons.svelte';
	import ButtonIcon from '$lib/components/form-elements/ButtonIcon.svelte';
	import IconAdjustmentsHorizontal from '$lib/icons/AdjustmentsHorizontal.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Button from '$lib/components/form-elements/Button2.svelte';

	import { viewSectionOptions } from '../page-data-options/view-sections';

	import {
		fuelTechOptions,
		milestoneTypeOptions,
		periodOptions
	} from '../page-data-options/filters.js';

	const { selectedView, selectedFuelTechs, selectedMetrics, selectedPeriods } =
		getContext('records-filters');

	let showMobileFilterOptions = false;

	/**
	 * @param {string} value
	 * @param {boolean} isMetaPressed
	 */
	function handleFuelTechChange(value, isMetaPressed) {
		if (isMetaPressed) {
			$selectedFuelTechs = [value];
		} else if ($selectedFuelTechs.includes(value)) {
			$selectedFuelTechs = $selectedFuelTechs.filter((item) => item !== value);
		} else {
			$selectedFuelTechs = [...$selectedFuelTechs, value];
		}
	}

	/**
	 * @param {string} value
	 * @param {boolean} isMetaPressed
	 */
	function handleMetricChange(value, isMetaPressed) {
		if (isMetaPressed) {
			$selectedMetrics = [value];
		} else if ($selectedMetrics.includes(value)) {
			$selectedMetrics = $selectedMetrics.filter((item) => item !== value);
		} else {
			$selectedMetrics = [...$selectedMetrics, value];
		}
	}

	/**
	 * @param {string} value
	 * @param {boolean} isMetaPressed
	 */
	function handlePeriodChange(value, isMetaPressed) {
		if (isMetaPressed) {
			$selectedPeriods = [value];
		} else if ($selectedPeriods.includes(value)) {
			$selectedPeriods = $selectedPeriods.filter((item) => item !== value);
		} else {
			$selectedPeriods = [...$selectedPeriods, value];
		}
	}
</script>

{#if showMobileFilterOptions}
	<Modal
		maxWidthClass=""
		class="!fixed bg-white top-0 bottom-0 left-0 right-0 overflow-y-auto overscroll-contain !rounded-none !my-0 pt-0 px-0 z-50"
	>
		<header
			class="sticky top-0 z-50 bg-white pb-2 pt-6 px-10 flex justify-between items-center border-b border-warm-grey"
		>
			<h3 class="mb-2">Filters</h3>

			<div class="mb-2">
				<IconAdjustmentsHorizontal class="size-10" />
			</div>
		</header>

		<section class="p-10 pb-0 w-full flex gap-5">
			<FormMultiSelect
				options={fuelTechOptions}
				selected={$selectedFuelTechs}
				label="Technology"
				paddingX=""
				staticDisplay={true}
				on:change={(evt) => handleFuelTechChange(evt.detail.value, evt.detail.isMetaPressed)}
			/>
		</section>

		<section class="p-10 w-full flex gap-5">
			<FormMultiSelect
				options={milestoneTypeOptions}
				selected={$selectedMetrics}
				label="Metric"
				paddingX=""
				staticDisplay={true}
				on:change={(evt) => handleMetricChange(evt.detail.value, evt.detail.isMetaPressed)}
			/>

			<FormMultiSelect
				options={periodOptions}
				selected={$selectedPeriods}
				label="Period"
				paddingX=""
				staticDisplay={true}
				on:change={(evt) => handlePeriodChange(evt.detail.value, evt.detail.isMetaPressed)}
			/>
		</section>

		<div slot="buttons" class="flex gap-3">
			<Button
				class="!bg-dark-grey text-white hover:!bg-black w-full"
				on:click={() => (showMobileFilterOptions = false)}>Close</Button
			>
		</div>
	</Modal>
{/if}

<div class="container">
	<div class="flex justify-end md:justify-between items-center">
		<div class="hidden md:inline-flex justify-start items-center">
			<FormMultiSelect
				options={fuelTechOptions}
				selected={$selectedFuelTechs}
				label="Technology"
				paddingX="px-7"
				paddingY="py-3"
				on:change={(evt) => handleFuelTechChange(evt.detail.value, evt.detail.isMetaPressed)}
			/>

			<FormMultiSelect
				options={milestoneTypeOptions}
				selected={$selectedMetrics}
				label="Metric"
				paddingX="px-7"
				paddingY="py-3"
				on:change={(evt) => handleMetricChange(evt.detail.value, evt.detail.isMetaPressed)}
			/>

			<FormMultiSelect
				options={periodOptions}
				selected={$selectedPeriods}
				label="Period"
				paddingX="px-7"
				paddingY="py-3"
				on:change={(evt) => handlePeriodChange(evt.detail.value, evt.detail.isMetaPressed)}
			/>
		</div>

		<div class="hidden md:block">
			<Switch
				buttons={viewSectionOptions}
				selected={$selectedView}
				on:change={(evt) => ($selectedView = evt.detail.value)}
				class="justify-center my-4"
			/>
		</div>

		<div class="md:hidden pl-8 ml-4 border-l border-warm-grey">
			<ButtonIcon on:click={() => (showMobileFilterOptions = true)}>
				<IconAdjustmentsHorizontal class="size-10" />
			</ButtonIcon>
		</div>
	</div>
</div>
